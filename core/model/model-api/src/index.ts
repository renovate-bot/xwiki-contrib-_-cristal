/*
 * See the LICENSE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

/**
 * @since 0.12
 */
enum EntityType {
  WIKI,
  SPACE,
  DOCUMENT,
  ATTACHMENT,
}

/**
 * @since 0.12
 */
interface BaseEntityReference {
  type: EntityType;
}

/**
 * @since 0.12
 */
class WikiReference implements BaseEntityReference {
  type: EntityType.WIKI = EntityType.WIKI;

  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

/**
 * @since 0.12
 */
class SpaceReference implements BaseEntityReference {
  type: EntityType.SPACE = EntityType.SPACE;
  wiki?: WikiReference;
  names: string[];

  constructor(wiki?: WikiReference, ...names: string[]) {
    this.wiki = wiki;
    this.names = names;
  }
}

/**
 * @since 0.12
 */
class DocumentReference implements BaseEntityReference {
  type: EntityType.DOCUMENT = EntityType.DOCUMENT;
  space?: SpaceReference;
  name: string;
  /**
   * Indicates whether the current document reference is terminal.
   * @since 0.13
   */
  terminal: boolean;

  constructor(name: string, space?: SpaceReference, terminal?: boolean) {
    this.space = space;
    this.name = name;
    this.terminal = terminal ?? false;
  }
}

/**
 * @since 0.12
 */
class AttachmentReference implements BaseEntityReference {
  type: EntityType.ATTACHMENT = EntityType.ATTACHMENT;
  name: string;
  document: DocumentReference;

  constructor(name: string, document: DocumentReference) {
    this.name = name;
    this.document = document;
  }
}

/**
 * @since 0.16
 */
type EntityReference =
  | AttachmentReference
  | DocumentReference
  | SpaceReference
  | WikiReference;

export {
  AttachmentReference,
  DocumentReference,
  type EntityReference,
  EntityType,
  SpaceReference,
  WikiReference,
};
