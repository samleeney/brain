#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Setup script for ainotes package.

This file provides compatibility for pip installation alongside the pyproject.toml file.
"""

from setuptools import setup, find_packages
import os

# Read the README file for long description
here = os.path.abspath(os.path.dirname(__file__))
readme_path = os.path.join(here, 'README.md')
long_description = ""
if os.path.exists(readme_path):
    with open(readme_path, encoding='utf-8') as f:
        long_description = f.read()

setup(
    name='ainotes',
    version='0.1.0',
    description='A command-line tool for LLMs to efficiently navigate and understand markdown-based knowledge bases',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='Your Name',
    author_email='your.email@example.com',
    url='https://github.com/yourusername/ainotes',
    project_urls={
        'Bug Tracker': 'https://github.com/yourusername/ainotes/issues',
        'Documentation': 'https://github.com/yourusername/ainotes/blob/main/README.md',
        'Source Code': 'https://github.com/yourusername/ainotes',
    },
    packages=find_packages(exclude=['tests', 'tests.*', 'docs', 'docs.*']),
    python_requires='>=3.8',
    install_requires=[
        'click>=8.0',
        'python-markdown>=3.0',
        'networkx>=2.5',
        'pyyaml>=5.0',
        'watchdog>=2.0',
    ],
    extras_require={
        'dev': [
            'pytest>=7.0',
            'pytest-cov>=4.0',
            'black>=23.0',
            'isort>=5.0',
            'flake8>=6.0',
            'mypy>=1.0',
            'pre-commit>=3.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'ainotes=ainotes.cli.main:cli',
        ],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Text Processing :: Markup',
        'Topic :: Utilities',
    ],
    keywords='markdown knowledge-base llm cli graph',
    zip_safe=False,
    include_package_data=True,
)