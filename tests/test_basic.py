"""Basic tests for AINodes functionality."""

import pytest
from pathlib import Path
import tempfile
import os

# Add the parent directory to sys.path to import ainotes
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from ainotes.parser.markdown import MarkdownParser
from ainotes.parser.links import LinkResolver
from ainotes.graph.builder import GraphBuilder


def test_markdown_parser():
    """Test basic markdown parsing functionality."""
    parser = MarkdownParser()
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write("""# Test Note

This is a test note with [[another-note]] link and [markdown link](other.md).

## Section
Content with #tag and another [[note-name|display text]].
""")
        temp_path = Path(f.name)
    
    try:
        note = parser.parse_file(temp_path, temp_path.parent)
        
        # Check basic properties
        assert note.title == "Test Note"
        assert len(note.headings) == 2
        assert note.headings[0].text == "Test Note"
        assert note.headings[1].text == "Section"
        
        # Check tags
        assert "tag" in note.tags
        
        # Check links
        assert len(note.outgoing_links) == 3
        link_texts = [link.link_text for link in note.outgoing_links]
        assert "another-note" in link_texts
        assert "other.md" in link_texts
        assert "note-name" in link_texts
        
    finally:
        os.unlink(temp_path)


def test_link_resolver():
    """Test link resolution functionality."""
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create test files
        (temp_path / "note1.md").write_text("# Note 1")
        (temp_path / "note2.md").write_text("# Note 2") 
        
        resolver = LinkResolver(temp_path)
        
        # Test the file index
        assert "note1" in resolver.file_index
        assert "note2" in resolver.file_index


def test_graph_builder():
    """Test graph building functionality."""
    # Use the sample notes
    sample_notes_path = Path(__file__).parent / "sample_notes"
    
    if sample_notes_path.exists():
        builder = GraphBuilder(sample_notes_path)
        graph = builder.build_graph()
        
        # Check that we have notes
        assert len(graph.nodes) > 0
        
        # Check that we have the expected notes
        note_names = [Path(path).name for path in graph.nodes.keys()]
        assert "index.md" in note_names
        
        # Check that we have links
        total_links = sum(len(node.note.outgoing_links) for node in graph.nodes.values())
        assert total_links > 0


if __name__ == "__main__":
    test_markdown_parser()
    test_link_resolver() 
    test_graph_builder()
    print("All tests passed!")