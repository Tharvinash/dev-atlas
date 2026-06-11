# DevAtlas

## Project Purpose

DevAtlas is an AI-powered context navigator for Guidewire frontend engineering teams.

The goal is to reduce onboarding time, eliminate knowledge silos, and help engineers understand code changes without manually searching through Git history, Jira tickets, Confluence documentation, and source code.

DevAtlas focuses specifically on Guidewire frontend projects built with Jutro.

## Primary Problem

Developers spend significant time:

* Searching Git history
* Reading Jira tickets
* Searching Confluence
* Tracing component dependencies
* Identifying OOTB vs custom implementations
* Understanding ripple effects of changes

Senior engineers frequently act as human search engines.

DevAtlas consolidates these sources into a single developer experience.

## MVP Scope

The hackathon version focuses exclusively on:

* Guidewire frontend codebases
* Jutro projects
* File-level analysis
* Git commit history
* Jira correlation
* Confluence correlation
* Dependency analysis
* Impact analysis

## Non Goals

Do not build:

* Authentication
* Multi-user support
* RBAC
* Real-time collaboration
* Vector databases
* Multi-agent systems
* CI/CD integrations
* GitHub/GitLab integrations
* Full enterprise search

## Design Principles

1. Developer-first UX
2. Fast analysis
3. Minimal clicks
4. Single pane of glass
5. Enterprise appearance
6. Dark mode by default

## Technology Stack

Frontend:

* Next.js 14
* TypeScript
* Tailwind
* shadcn/ui

Backend:

* Node.js
* TypeScript

AI:

* Claude API

Data Sources:

* Local repository
* Git history
* Jira
* Confluence

## Success Criteria

A developer can select a file and immediately understand:

* What the file does
* Why it exists
* Who modified it
* Which Jira tickets are related
* Which documentation is related
* What depends on it
* What may break if changed

without leaving DevAtlas.
