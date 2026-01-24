/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { ZIndexConfig } from './types';
import { defaultZIndex } from './theme';

/**
 * Generate z-index CSS classes
 */
export function generateZIndexCSS(zIndex: ZIndexConfig = defaultZIndex): string {
  const classes: string[] = [];

  if (zIndex.popupNotice !== undefined) {
    classes.push(`.z-popup-notice { z-index: ${zIndex.popupNotice} !important; }`);
  }
  if (zIndex.alert !== undefined) {
    classes.push(`.z-alert { z-index: ${zIndex.alert} !important; }`);
  }
  if (zIndex.toast !== undefined) {
    classes.push(`.z-toast { z-index: ${zIndex.toast} !important; }`);
  }
  if (zIndex.modal !== undefined) {
    classes.push(`.z-modal { z-index: ${zIndex.modal} !important; }`);
  }
  if (zIndex.modalBackdrop !== undefined) {
    classes.push(`.z-modal-backdrop { z-index: ${zIndex.modalBackdrop} !important; }`);
  }
  if (zIndex.formPopup !== undefined) {
    classes.push(`.z-form-popup { z-index: ${zIndex.formPopup} !important; }`);
  }
  if (zIndex.bottomMenu !== undefined) {
    classes.push(`.z-bottom-menu { z-index: ${zIndex.bottomMenu} !important; }`);
  }
  if (zIndex.sidebar !== undefined) {
    classes.push(`.z-sidebar { z-index: ${zIndex.sidebar} !important; }`);
  }
  if (zIndex.sidebarBackdrop !== undefined) {
    classes.push(`.z-sidebar-backdrop { z-index: ${zIndex.sidebarBackdrop} !important; }`);
  }
  if (zIndex.content !== undefined) {
    classes.push(`.z-content { z-index: ${zIndex.content}; }`);
  }
  if (zIndex.header !== undefined) {
    classes.push(`.z-header { z-index: ${zIndex.header}; }`);
  }
  if (zIndex.permissionModal !== undefined) {
    classes.push(`.z-permission-modal { z-index: ${zIndex.permissionModal} !important; }`);
  }

  return classes.join('\n');
}

/**
 * Get z-index value by key
 */
export function getZIndex(key: keyof ZIndexConfig, zIndex: ZIndexConfig = defaultZIndex): number | undefined {
  return zIndex[key];
}
