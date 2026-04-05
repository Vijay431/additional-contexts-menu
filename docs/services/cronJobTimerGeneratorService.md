---
layout: default
title: 'Cron Job Timer Generator Service'
description: 'Documentation for Cron Job Timer Generator Service - cron expression generation for Additional Context Menus.'
---

<h1>Cron Job Timer Generator Service</h1>

<h2>Overview</h2>
<p>Generates cron job timer expressions for scheduled tasks with preset templates and custom schedule building.</p>

<h3>Key Features</h3>
<ul>
<li>Preset schedule templates (every minute, hour, day, week, month)</li>
<li>Custom schedule builder with field-by-field input</li>
<li>Input validation for each cron field</li>
<li>Comment generation for schedule documentation</li>
<li>Quick insertion at cursor position</li>
</ul>

<h2>Cron Expression Format</h2>

<p>* * * *</p>
<ul>
<li><strong>Minute</strong> (0-59 or *)</li>
<li><strong>Hour</strong> (0-23 or *)</li>
<li><strong>Day of month</strong> (1-31 or *)</li>
<li><strong>Month</strong> (1-12 or *)</li>
<li><strong>Day of week</strong> (0-6, 0=Sunday)</li>
<li><strong>Command</strong> - Command to execute</li>
</ul>

<h2>Preset Schedules</h2>

<ul>
<li>Every minute: * * * *</li>
<li>Every hour: 0 * * *</li>
<li>Daily at midnight: 0 0 * *</li>
<li>Daily at 9am: 0 9 * *</li>
<li>Every Monday at 9am: 0 9 * * 1</li>
<li>Every 1st of month: 0 0 1 *</li>
<li>Every weekday at 9am: 0 9 * * 1-5</li>
<li>Every 6 hours: 0 */6 * * *</li>
</ul>

<h2>API Reference</h2>

<h3>generateCronExpression()</h3>
<p>Generates cron expression with QuickPick selection or custom input.</p>

<h3>promptForCustomSchedule()</h3>
<p>Builds custom cron expression field by field with validation.</p>

<h3>insertCronExpression()</h3>
<p>Inserts cron expression at cursor position with comment.</p>

<h2>Use Cases</h2>

<ul>
<li>Setting up scheduled backup jobs</li>
<li>Creating automated reports</li>
<li>Data synchronization schedules</li>
<li>Periodic maintenance tasks</li>
<li>Automated deployment jobs</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
