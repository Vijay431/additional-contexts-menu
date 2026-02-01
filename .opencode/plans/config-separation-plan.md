# Configuration Separation & File Conversion Plan

# ============================================

## Overview

This plan separates ESLint configuration for src/ (strict) and test/ (relaxed) directories,
makes Prettier stricter on all files, converts all files to UTF-8 and LF format, and
reorganizes .gitignore and .vscodeignore files by categories.

## Files to Modify

1. eslint.config.mjs - Restructure with separate strict/relaxed sections
2. .prettierrc - Add stricter rules and LF enforcement
3. .gitignore - Reorganize by categories
4. .vscodeignore - Reorganize by categories
5. All source/config files - Convert to UTF-8 and LF (126 files)

## Detailed Changes
