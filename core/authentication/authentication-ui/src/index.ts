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

import { Container } from "inversify";
import { UIExtension } from "@xwiki/cristal-uiextension-api";
import { LoginMenuUIExtension } from "./LoginMenuUIExtension";
import { LoggedInMenuUIExtension } from "./LoggedInMenuUIExtension";

export class ComponentInit {
  constructor(container: Container) {
    container
      .bind<UIExtension>("UIExtension")
      .to(LoginMenuUIExtension)
      .inSingletonScope();
    container
      .bind<UIExtension>("UIExtension")
      .to(LoggedInMenuUIExtension)
      .inSingletonScope();
  }
}