---
layout: default
title: 'Features Documentation'
description: 'Documentation for all 11 user-facing features of Additional Context Menus.'
---

# Features Documentation

Complete documentation for all 11 user-facing features in Additional Context Menus.

## Code Operations

- [Copy Function](copyFunction.html) - Copy function at cursor to clipboard
- [Copy Function to File](copyFunctionToFile.html) - Copy function at cursor to a target file
- [Move Function to File](moveFunctionToFile.html) - Move function at cursor to a target file
- [Copy Selection to File](copySelectionToFile.html) - Copy selected code to a target file
- [Move Selection to File](moveSelectionToFile.html) - Move selected code to a target file
- [Copy File Contents](copyFileContents.html) - Copy entire file contents to clipboard without opening it

## Workspace

- [Save All](fileSaveService.html) - Save all open files with progress feedback
- [Open in Terminal](terminalService.html) - Open terminal at file location
- [Rename File to Convention](fileNamingConventionService.html) - Rename files to kebab-case, camelCase, or PascalCase

## Code Generation

- [Generate Enum from Union Type](enumGeneratorService.html) - Convert TypeScript union types to enums
- [Generate Cron Expression](cronJobTimerGeneratorService.html) - Interactive cron expression builder
- [Generate .env File](envFileGeneratorService.html) - Generate .env file from .env.example template

## Quick Reference

| Feature                   | Command ID                                    | Keybinding         |
| ------------------------- | --------------------------------------------- | ------------------ |
| Copy Function             | `additionalContextMenus.copyFunction`         | `Ctrl+Alt+Shift+F` |
| Copy Function to File     | `additionalContextMenus.copyFunctionToFile`   | `Ctrl+Alt+Shift+E` |
| Move Function to File     | `additionalContextMenus.moveFunctionToFile`   | `Ctrl+Alt+Shift+R` |
| Copy Selection to File    | `additionalContextMenus.copySelectionToFile`  | `Ctrl+Alt+Shift+C` |
| Move Selection to File    | `additionalContextMenus.moveSelectionToFile`  | `Ctrl+Alt+Shift+M` |
| Save All                  | `additionalContextMenus.saveAll`              | `Ctrl+Alt+Shift+A` |
| Open in Terminal          | `additionalContextMenus.openInTerminal`       | `Ctrl+Alt+Shift+T` |
| Rename File to Convention | `additionalContextMenus.renameFileConvention` | —                  |
| Copy File Contents        | `additionalContextMenus.copyFileContents`     | —                  |
| Generate Enum             | `additionalContextMenus.generateEnum`         | —                  |
| Generate Cron Expression  | `additionalContextMenus.generateCronTimer`    | —                  |
| Generate .env File        | `additionalContextMenus.generateEnvFile`      | —                  |

## Navigation

- [Back to Home](/)
- [Features Overview](/features.html)
- [Code Operations](/code-operations.html)
