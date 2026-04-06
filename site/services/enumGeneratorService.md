---
layout: default
title: 'Enum Generator Service'
description: 'Documentation for Enum Generator Service - union type to enum conversion for Additional Context Menus.'
---

<h1>Enum Generator Service</h1>

<h2>Overview</h2>
<p>Generates TypeScript enum types from string literal union types with smart value conversion and code formatting.</p>

<h3>Key Features</h3>
<ul>
<li>Union type parsing (type alias and inline types)</li>
<li>String literal extraction from union types</li>
<li>Enum value name conversion (kebab-case → PascalCase)</li>
<li>PascalCase validation for enum names</li>
<li>Smart code insertion at cursor position</li>
<li>File handling (requires saved files)</li>
</ul>

<h2>Supported Patterns</h2>

<p><strong>Type alias:</strong> type Status = "pending" | "approved" | "rejected"</p>
<p><strong>Inline type:</strong> status: "active" | "inactive"</p>

<h2>Value Conversion Rules</h2>

<ul>
<li>my-status → MyStatus</li>
<li>user_id → UserId</li>
<li>API_KEY → ApiKey</li>
<li>is-active → IsActive</li>
<li>Spaces removed and converted appropriately</li>
</ul>

<h2>API Reference</h2>

<h3>generateEnumFromSelection()</h3>
<p>Generates enum from selected union type.</p>

<h3>parseUnionType()</h3>
<p>Parses union type syntax.</p>

<h3>promptForEnumName()</h3>
<p>Prompts user for enum name with validation.</p>

<h2>Use Cases</h2>

<ul>
<li>Converting union types to enums for better type safety</li>
<li>Improving IDE autocomplete with enum values</li>
<li>Migrating from union types to enums</li>
<li>Type safety improvements</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
