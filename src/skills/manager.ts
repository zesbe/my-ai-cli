/**
 * Skills Manager for Zesbe CLI
 * Skills are folders with instructions that AI can load dynamically
 * Similar to Claude Code's Skills feature
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Skill, SkillFile, SkillMetadata } from '../types/index.js';

// Skills directories
const SKILLS_DIRS = [
  path.join(os.homedir(), '.zesbe', 'skills'),      // User skills
  path.join(process.cwd(), '.skills'),               // Project skills
];

interface ParsedSkill {
  name: string;
  description: string;
  instructions: string;
}

// Parse SKILL.md frontmatter
function parseSkillMd(content: string): ParsedSkill {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return { name: 'Unknown', description: '', instructions: content };
  }

  const frontmatter = frontmatterMatch[1];
  const instructions = content.slice(frontmatterMatch[0].length).trim();

  // Parse YAML-like frontmatter
  const meta: Record<string, string> = {};
  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      meta[key.trim()] = valueParts.join(':').trim();
    }
  });

  return {
    name: meta.name || 'Unknown',
    description: meta.description || '',
    instructions
  };
}

interface LoadSkillResult {
  success: boolean;
  error?: string;
  alreadyLoaded?: boolean;
  skill?: Skill;
}

interface CreateSkillResult {
  success: boolean;
  error?: string;
  path?: string;
}

export class SkillsManager {
  private availableSkills: Map<string, SkillMetadata>;
  private loadedSkills: Map<string, Skill>;

  constructor() {
    this.availableSkills = new Map();
    this.loadedSkills = new Map();
  }

  // Scan for available skills
  scanSkills(): SkillMetadata[] {
    this.availableSkills.clear();

    for (const dir of SKILLS_DIRS) {
      if (!fs.existsSync(dir)) continue;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const skillPath = path.join(dir, entry.name);
          const skillMdPath = path.join(skillPath, 'SKILL.md');

          if (!fs.existsSync(skillMdPath)) continue;

          try {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            const { name, description } = parseSkillMd(content);

            this.availableSkills.set(entry.name, {
              id: entry.name,
              path: skillPath,
              name,
              description,
              source: dir.includes('.zesbe') ? 'user' : 'project'
            });
          } catch (_e) {
            // Skip invalid skills
          }
        }
      } catch (_e) {
        // Skip inaccessible directories
      }
    }

    return Array.from(this.availableSkills.values());
  }

  // Load a skill
  loadSkill(skillId: string): LoadSkillResult {
    const skillInfo = this.availableSkills.get(skillId);
    if (!skillInfo) {
      return { success: false, error: `Skill "${skillId}" not found` };
    }

    if (this.loadedSkills.has(skillId)) {
      return { success: true, alreadyLoaded: true };
    }

    try {
      const skillMdPath = path.join(skillInfo.path, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const { name, description, instructions } = parseSkillMd(content);

      // List additional files in skill directory
      const files: SkillFile[] = fs.readdirSync(skillInfo.path)
        .filter(f => f !== 'SKILL.md')
        .map(f => ({
          name: f,
          path: path.join(skillInfo.path, f)
        }));

      const skill: Skill = {
        id: skillId,
        name,
        description,
        instructions,
        files,
        path: skillInfo.path
      };

      this.loadedSkills.set(skillId, skill);

      return { success: true, skill };
    } catch (e) {
      const error = e as Error;
      return { success: false, error: error.message };
    }
  }

  // Unload a skill
  unloadSkill(skillId: string): boolean {
    if (this.loadedSkills.has(skillId)) {
      this.loadedSkills.delete(skillId);
      return true;
    }
    return false;
  }

  // Get all loaded skills
  getLoadedSkills(): Skill[] {
    return Array.from(this.loadedSkills.values());
  }

  // Get skill instructions for AI context
  getSkillsContext(): string {
    if (this.loadedSkills.size === 0) return '';

    let context = '\n\n## Loaded Skills:\n';

    for (const [, skill] of this.loadedSkills) {
      context += `\n### Skill: ${skill.name}\n`;
      context += skill.instructions + '\n';

      if (skill.files.length > 0) {
        context += `\nAdditional files in this skill: ${skill.files.map(f => f.name).join(', ')}\n`;
      }
    }

    return context;
  }

  // Read a file from a loaded skill
  readSkillFile(skillId: string, fileName: string): string | null {
    const skill = this.loadedSkills.get(skillId);
    if (!skill) return null;

    const file = skill.files.find(f => f.name === fileName);
    if (!file) return null;

    try {
      return fs.readFileSync(file.path, 'utf-8');
    } catch (_e) {
      return null;
    }
  }

  // Create skills directory if not exists
  ensureSkillsDir(): string {
    const userSkillsDir = path.join(os.homedir(), '.zesbe', 'skills');
    if (!fs.existsSync(userSkillsDir)) {
      fs.mkdirSync(userSkillsDir, { recursive: true });
    }
    return userSkillsDir;
  }

  // Create a new skill template
  createSkillTemplate(skillId: string): CreateSkillResult {
    const skillsDir = this.ensureSkillsDir();
    const skillPath = path.join(skillsDir, skillId);

    if (fs.existsSync(skillPath)) {
      return { success: false, error: 'Skill already exists' };
    }

    try {
      fs.mkdirSync(skillPath, { recursive: true });

      const template = `---
name: ${skillId}
description: Description of what this skill does
---

# ${skillId}

## When to use this skill
Describe when AI should use this skill...

## Instructions
Step-by-step instructions for AI...

## Examples
Example usage...
`;

      fs.writeFileSync(path.join(skillPath, 'SKILL.md'), template);

      return { success: true, path: skillPath };
    } catch (e) {
      const error = e as Error;
      return { success: false, error: error.message };
    }
  }

  // Get available skills
  getAvailableSkills(): SkillMetadata[] {
    return Array.from(this.availableSkills.values());
  }
}

// Singleton
let skillsManager: SkillsManager | null = null;

export function getSkillsManager(): SkillsManager {
  if (!skillsManager) {
    skillsManager = new SkillsManager();
    skillsManager.scanSkills();
  }
  return skillsManager;
}
