import { Board, Column } from '../types';
import { nanoid } from 'nanoid';

/**
 * Factory Pattern - Creates boards with predefined configurations
 *
 * Benefits:
 * - Encapsulates object creation logic
 * - Provides sensible defaults
 * - Easy to create different board templates
 * - Reduces code duplication
 */

export interface BoardTemplate {
  name: string;
  description: string;
  columns: { name: string }[];
}

/**
 * Predefined board templates
 */
export const BOARD_TEMPLATES = {
  /**
   * Basic Kanban board
   */
  BASIC_KANBAN: {
    name: 'Basic Kanban',
    description: 'Simple kanban board with 4 columns',
    columns: [
      { name: 'Backlog' },
      { name: 'In Progress' },
      { name: 'Review' },
      { name: 'Done' },
    ],
  },

  /**
   * Full SDLC board
   */
  SDLC: {
    name: 'Software Development Lifecycle',
    description: 'Complete SDLC workflow board',
    columns: [
      { name: 'Ideation' },
      { name: 'Refinement' },
      { name: 'Development' },
      { name: 'Testing' },
      { name: 'Review' },
      { name: 'Deployment' },
      { name: 'Done' },
    ],
  },

  /**
   * Bug tracking board
   */
  BUG_TRACKER: {
    name: 'Bug Tracker',
    description: 'Board for tracking and fixing bugs',
    columns: [
      { name: 'Reported' },
      { name: 'Confirmed' },
      { name: 'In Progress' },
      { name: 'Fixed' },
      { name: 'Verified' },
      { name: 'Closed' },
    ],
  },

  /**
   * Feature development board
   */
  FEATURE_DEV: {
    name: 'Feature Development',
    description: 'Board for developing new features',
    columns: [
      { name: 'Ideas' },
      { name: 'Spec' },
      { name: 'Design' },
      { name: 'Implementation' },
      { name: 'QA' },
      { name: 'Released' },
    ],
  },
} as const;

export type TemplateName = keyof typeof BOARD_TEMPLATES;

export class BoardFactory {
  /**
   * Create a board from a template
   */
  static createFromTemplate(
    templateName: TemplateName,
    ownerId: string,
    customName?: string
  ): Board {
    const template = BOARD_TEMPLATES[templateName];

    const boardId = nanoid();
    const columns: Column[] = template.columns.map((col, index) => ({
      id: nanoid(),
      boardId,
      name: col.name,
      position: index,
      cardIds: [],
    }));

    return {
      id: boardId,
      name: customName || template.name,
      description: template.description,
      columns,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create a custom board
   */
  static createCustom(
    name: string,
    description: string,
    ownerId: string,
    columnNames: string[]
  ): Board {
    const boardId = nanoid();
    const columns: Column[] = columnNames.map((name, index) => ({
      id: nanoid(),
      boardId,
      name,
      position: index,
      cardIds: [],
    }));

    return {
      id: boardId,
      name,
      description,
      columns,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create a default board (Basic Kanban)
   */
  static createDefault(ownerId: string, name: string = 'My Board'): Board {
    return this.createFromTemplate('BASIC_KANBAN', ownerId, name);
  }

  /**
   * Get all available templates
   */
  static getTemplates(): { name: TemplateName; template: BoardTemplate }[] {
    return Object.entries(BOARD_TEMPLATES).map(([name, template]) => ({
      name: name as TemplateName,
      template,
    }));
  }
}
