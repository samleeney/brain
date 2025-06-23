import { ParserFactory } from '../src/parser/ParserFactory';
import { PDFParser } from '../src/parser/PDFParser';
import { TXTParser } from '../src/parser/TXTParser';
import { ORGParser } from '../src/parser/ORGParser';
import * as fs from 'fs';
import * as path from 'path';

describe('ParserFactory', () => {
  let factory: ParserFactory;

  beforeEach(() => {
    factory = new ParserFactory();
  });

  test('should return appropriate parser for file extensions', () => {
    expect(factory.getParser('test.md')?.constructor.name).toBe('MarkdownParser');
    expect(factory.getParser('test.txt')?.constructor.name).toBe('TXTParser');
    expect(factory.getParser('test.org')?.constructor.name).toBe('ORGParser');
    expect(factory.getParser('test.pdf')?.constructor.name).toBe('PDFParser');
    expect(factory.getParser('test.unknown')).toBeNull();
  });

  test('should return supported extensions', () => {
    const extensions = factory.getSupportedExtensions();
    expect(extensions).toContain('.md');
    expect(extensions).toContain('.txt');
    expect(extensions).toContain('.org');
    expect(extensions).toContain('.pdf');
  });

  test('should return supported patterns', () => {
    const patterns = factory.getSupportedPatterns();
    expect(patterns).toContain('**/*.md');
    expect(patterns).toContain('**/*.txt');
    expect(patterns).toContain('**/*.org');
    expect(patterns).toContain('**/*.pdf');
  });
});

describe('TXTParser', () => {
  let parser: TXTParser;
  let tempFilePath: string;

  beforeEach(() => {
    parser = new TXTParser();
    tempFilePath = path.join(__dirname, 'temp-test.txt');
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should parse plain text file', async () => {
    const content = `Test Document

This is a paragraph with a URL: https://example.com and a hashtag #test.

1. Introduction
Some content here.

A. Subsection
More content with another hashtag #important.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parse(tempFilePath, content, __dirname);
    
    expect(parsed.title).toBe('temp-test');
    expect(parsed.headings.length).toBeGreaterThan(0);
    expect(parsed.outgoingLinks.length).toBe(1);
    expect(parsed.outgoingLinks[0].linkText).toBe('https://example.com');
    expect(parsed.tags.has('test')).toBe(true);
    expect(parsed.tags.has('important')).toBe(true);
  });

  test('should extract underlined headings', async () => {
    const content = `Main Title
==========

This is content under the main title.

Subtitle
--------

This is content under the subtitle.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parse(tempFilePath, content, __dirname);
    
    expect(parsed.headings.length).toBe(2);
    expect(parsed.headings[0].text).toBe('Main Title');
    expect(parsed.headings[0].level).toBe(1);
    expect(parsed.headings[1].text).toBe('Subtitle');
    expect(parsed.headings[1].level).toBe(2);
  });

  test('should extract metadata from key-value pairs', async () => {
    const content = `Title: Test Document
Author: John Doe
Date: 2024-01-01

This is the main content of the document.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parse(tempFilePath, content, __dirname);
    
    expect(parsed.frontmatter.title).toBe('Test Document');
    expect(parsed.frontmatter.author).toBe('John Doe');
    expect(parsed.frontmatter.date).toBe('2024-01-01');
  });

  test('should support file extensions', () => {
    expect(parser.supports('.txt')).toBe(true);
    expect(parser.supports('.text')).toBe(true);
    expect(parser.supports('.md')).toBe(false);
  });
});

describe('ORGParser', () => {
  let parser: ORGParser;
  let tempFilePath: string;

  beforeEach(() => {
    parser = new ORGParser();
    tempFilePath = path.join(__dirname, 'temp-test.org');
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should parse org-mode file', async () => {
    const content = `#+TITLE: Test Org Document
#+AUTHOR: John Doe
#+TAGS: test important

* Main Heading :tag1:tag2:

This is content with [[internal-link]] and https://example.com.

** TODO Subheading [#A]

More content with #hashtag.

*** DONE Another level
Content here.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parse(tempFilePath, content, __dirname);
    
    expect(parsed.title).toBe('Test Org Document');
    expect(parsed.headings.length).toBe(3);
    expect(parsed.headings[0].text).toBe('Main Heading');
    expect(parsed.headings[1].text).toBe('Subheading');
    expect(parsed.headings[2].text).toBe('Another level');
    
    expect(parsed.outgoingLinks.length).toBe(2);
    expect(parsed.outgoingLinks[0].linkText).toBe('internal-link');
    expect(parsed.outgoingLinks[1].linkText).toBe('https://example.com');
    
    expect(parsed.tags.has('test')).toBe(true);
    expect(parsed.tags.has('important')).toBe(true);
    expect(parsed.tags.has('tag1')).toBe(true);
    expect(parsed.tags.has('tag2')).toBe(true);
    expect(parsed.tags.has('hashtag')).toBe(true);
    
    expect(parsed.frontmatter.title).toBe('Test Org Document');
    expect(parsed.frontmatter.author).toBe('John Doe');
  });

  test('should handle org links with descriptions', async () => {
    const content = `* Test Heading

This has a [[target][description]] link.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parse(tempFilePath, content, __dirname);
    
    expect(parsed.outgoingLinks.length).toBe(1);
    expect(parsed.outgoingLinks[0].linkText).toBe('target');
  });

  test('should clean org syntax from content', async () => {
    const content = `#+TITLE: Test

* Heading

This has *bold* and /italic/ and =code= text.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parse(tempFilePath, content, __dirname);
    
    // Word count should be calculated from cleaned content
    expect(parsed.wordCount).toBeGreaterThan(0);
  });

  test('should support file extension', () => {
    expect(parser.supports('.org')).toBe(true);
    expect(parser.supports('.md')).toBe(false);
  });
});