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
import { PageWriter } from "@xwiki/cristal-page-api";
import { stringify } from "yaml";

/**
 * @since 0.20
 */
class DefaultPageWriter implements PageWriter {
  writePage(page: { content: string; [key: string]: unknown }): string {
    const { content, ...metadata } = page;
    if (metadata && Object.keys(metadata).length > 0) {
      return `---
${stringify(metadata)}---
${content ?? ""}`;
    } else {
      return (content ?? "") as string;
    }
  }
}

export { DefaultPageWriter };
