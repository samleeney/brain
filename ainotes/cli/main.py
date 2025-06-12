"""Main CLI interface for AINodes."""

import click
from pathlib import Path
import sys
import os

from ..graph.builder import GraphBuilder
from ..graph.algorithms import GraphAnalyzer
from ..search.engine import SearchEngine
from ..formatters.output import LLMFormatter
from ..cache.manager import CacheManager


class Context:
    """CLI context object."""
    
    def __init__(self):
        self.notes_root = None
        self.graph = None
        self.search_engine = None
        self.formatter = None
        self.analyzer = None


pass_context = click.make_pass_decorator(Context, ensure=True)


@click.group()
@click.option('--notes-root', '-r', type=click.Path(exists=True, file_okay=False),
              help='Root directory of notes (default: current directory)')
@click.option('--no-cache', is_flag=True, help='Disable caching')
@pass_context
def cli(ctx: Context, notes_root: str, no_cache: bool):
    """AINodes - Knowledge Base Navigation Tool for LLMs."""
    # Set notes root
    if notes_root:
        ctx.notes_root = Path(notes_root).resolve()
    else:
        ctx.notes_root = Path.cwd()
    
    # Initialize components
    try:
        # Check if cache is available and valid
        cache_manager = CacheManager(ctx.notes_root)
        
        if no_cache:
            ctx.graph = None
        else:
            ctx.graph = cache_manager.load_cache()
        
        # Build graph if not cached or cache invalid
        if ctx.graph is None:
            click.echo("Building knowledge graph...", err=True)
            builder = GraphBuilder(ctx.notes_root)
            ctx.graph = builder.build_graph()
            
            if not no_cache:
                cache_manager.save_cache(ctx.graph)
        
        # Initialize other components
        ctx.search_engine = SearchEngine(ctx.graph)
        ctx.formatter = LLMFormatter()
        ctx.analyzer = GraphAnalyzer(ctx.graph)
        
    except Exception as e:
        click.echo(f"Error initializing AINodes: {e}", err=True)
        sys.exit(1)


@cli.command()
@pass_context
def overview(ctx: Context):
    """Display a high-level summary of the knowledge base."""
    output = ctx.formatter.format_overview(ctx.graph)
    click.echo(output)


@cli.command()
@click.argument('path', default='', required=False)
@pass_context
def ls(ctx: Context, path: str):
    """List notes in directory-style format."""
    output = ctx.formatter.format_ls(ctx.graph, path)
    click.echo(output)


@cli.command()
@click.argument('query')
@click.option('--limit', '-l', default=20, help='Maximum number of results')
@pass_context
def search(ctx: Context, query: str, limit: int):
    """Multi-strategy search across the knowledge base."""
    results = ctx.search_engine.search(query, limit=limit)
    output = ctx.formatter.format_search_results(results)
    click.echo(output)


@cli.command()
@click.argument('path')
@click.option('--no-content', is_flag=True, help='Show metadata only, not content')
@pass_context
def read(ctx: Context, path: str, no_content: bool):
    """Display a note with full context."""
    # Find the note
    matching_nodes = []
    
    for node_path, node in ctx.graph.nodes.items():
        if path in node_path or path in node.note.relative_path:
            matching_nodes.append((node_path, node))
    
    if not matching_nodes:
        click.echo(f"Note not found: {path}", err=True)
        return
    
    if len(matching_nodes) > 1:
        click.echo("Multiple matches found:", err=True)
        for node_path, node in matching_nodes:
            click.echo(f"  {node.note.relative_path}", err=True)
        return
    
    _, node = matching_nodes[0]
    
    # Read content if requested
    content = None
    if not no_content:
        try:
            content = Path(node.note.path).read_text(encoding='utf-8')
        except (UnicodeDecodeError, FileNotFoundError):
            content = "[Content could not be read]"
    
    output = ctx.formatter.format_note_read(node, content)
    click.echo(output)


@cli.command()
@click.argument('pattern')
@click.option('--context', '-C', default=2, help='Lines of context around matches')
@pass_context
def grep(ctx: Context, pattern: str, context: int):
    """Search file contents using regex patterns."""
    results = ctx.search_engine.grep_search(pattern, context_lines=context)
    output = ctx.formatter.format_grep_results(results)
    click.echo(output)


@cli.command()
@click.argument('pattern')
@pass_context
def glob(ctx: Context, pattern: str):
    """Find files matching glob patterns."""
    results = ctx.search_engine.glob_search(pattern)
    
    if not results:
        click.echo("No matching files found.")
        return
    
    for result in results:
        node = ctx.graph.nodes.get(result)
        if node:
            click.echo(node.note.relative_path)
        else:
            click.echo(result)


@cli.command()
@click.argument('source')
@click.argument('target')
@click.option('--max-paths', default=3, help='Maximum number of paths to show')
@pass_context
def trace(ctx: Context, source: str, target: str, max_paths: int):
    """Find connection paths between two notes."""
    # Find source and target notes
    source_path = None
    target_path = None
    
    for node_path, node in ctx.graph.nodes.items():
        if source in node_path or source in node.note.relative_path:
            source_path = node_path
        if target in node_path or target in node.note.relative_path:
            target_path = node_path
    
    if not source_path:
        click.echo(f"Source note not found: {source}", err=True)
        return
    
    if not target_path:
        click.echo(f"Target note not found: {target}", err=True)
        return
    
    paths = ctx.analyzer.find_shortest_paths(source_path, target_path, max_paths)
    output = ctx.formatter.format_trace_path(paths, ctx.graph)
    click.echo(output)


@cli.command()
@click.argument('path')
@click.option('--limit', '-l', default=15, help='Maximum number of related notes')
@pass_context
def related(ctx: Context, path: str, limit: int):
    """Find notes related to the given note."""
    # Find the note
    matching_nodes = []
    
    for node_path, node in ctx.graph.nodes.items():
        if path in node_path or path in node.note.relative_path:
            matching_nodes.append((node_path, node))
    
    if not matching_nodes:
        click.echo(f"Note not found: {path}", err=True)
        return
    
    if len(matching_nodes) > 1:
        click.echo("Multiple matches found:", err=True)
        for node_path, node in matching_nodes:
            click.echo(f"  {node.note.relative_path}", err=True)
        return
    
    node_path, _ = matching_nodes[0]
    
    related_notes = ctx.analyzer.find_related_notes(node_path, max_results=limit)
    output = ctx.formatter.format_related_notes(related_notes, ctx.graph)
    click.echo(output)


@cli.group()
def cache():
    """Cache management commands."""
    pass


@cache.command('clear')
@pass_context
def cache_clear(ctx: Context):
    """Clear the cache."""
    cache_manager = CacheManager(ctx.notes_root)
    cache_manager.clear_cache()
    click.echo("Cache cleared.")


@cache.command('rebuild')
@pass_context
def cache_rebuild(ctx: Context):
    """Rebuild the cache."""
    cache_manager = CacheManager(ctx.notes_root)
    cache_manager.clear_cache()
    
    click.echo("Rebuilding knowledge graph...", err=True)
    builder = GraphBuilder(ctx.notes_root)
    ctx.graph = builder.build_graph()
    
    cache_manager.save_cache(ctx.graph)
    click.echo("Cache rebuilt.")


@cache.command('stats')
@pass_context
def cache_stats(ctx: Context):
    """Show cache statistics."""
    cache_manager = CacheManager(ctx.notes_root)
    stats = cache_manager.get_cache_stats()
    
    if stats:
        click.echo(f"Cache file: {stats['cache_file']}")
        click.echo(f"Cache size: {stats['size_mb']:.1f} MB")
        click.echo(f"Last updated: {stats['last_updated']}")
        click.echo(f"Notes cached: {stats['notes_count']}")
    else:
        click.echo("No cache found.")


@cli.command()
@pass_context  
def stats(ctx: Context):
    """Show detailed graph statistics."""
    stats = ctx.analyzer.get_graph_statistics()
    
    click.echo("=== GRAPH STATISTICS ===")
    click.echo(f"Total notes: {stats['total_nodes']}")
    click.echo(f"Total links: {stats['total_edges']}")
    click.echo(f"Average degree: {stats['avg_degree']:.2f}")
    click.echo(f"Graph density: {stats['density']:.4f}")
    click.echo(f"Clusters: {stats['num_clusters']}")
    click.echo(f"Hub nodes: {stats['num_hubs']}")
    click.echo(f"Orphaned notes: {stats['num_orphans']}")
    click.echo(f"Broken links: {stats['num_broken_links']}")


if __name__ == '__main__':
    cli()