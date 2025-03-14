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
 * TODO: Rewrite this config to ESM
 * But currently electron-builder doesn't support ESM configs
 * @see https://github.com/develar/read-config-file/issues/10
 */

/**
 * @type {() => import("electron-builder").Configuration}
 * @see https://www.electron.build/configuration
 */
module.exports = async function () {
  const { getVersion } = await import("./version/getVersion.mjs");

  return {
    asar: true,
    appId: "org.xwiki.cristal",
    productName: "cristal",
    directories: {
      output: "dist",
      buildResources: "buildResources",
    },
    files: ["./renderer/dist/**", "./main/dist/**", "./preload/dist/**"],
    extraMetadata: {
      version: getVersion(),
    },

    // Specify linux target just for disabling snap compilation
    linux: {
      artifactName: "${productName}-${version}-linux-${arch}.${ext}",
      executableName: "cristal",
      category: "Application",
    },
    flatpak: {
      artifactName: "${productName}-${version}-linux-${arch}.${ext}",
      category: "Application",
      mimeTypes: null,
    },
    mac: {
      artifactName: "${productName}-${version}-mac-${arch}.${ext}",
      executableName: "cristal",
      target: "dmg",
      category: "Application",
    },
    win: {
      artifactName: "${productName}-${version}-win-${arch}.${ext}",
      executableName: "cristal",
      target: "nsis",
    },
  };
};
