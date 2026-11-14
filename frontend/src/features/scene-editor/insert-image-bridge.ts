/**
 * Tiny event bridge for the toolbar's image picker.
 *
 * The hidden file input lives in the floating toolbar; the keyboard shortcut is
 * handled deeper in the canvas. A DOM event avoids threading a ref through the
 * component tree or duplicating the file-input handling.
 */

const IMAGE_PICKER_EVENT = "avnac:open-image-picker";

export function requestImagePicker(): void {
  window.dispatchEvent(new Event(IMAGE_PICKER_EVENT));
}

export function onImagePickerRequest(handler: () => void): () => void {
  window.addEventListener(IMAGE_PICKER_EVENT, handler);
  return () => window.removeEventListener(IMAGE_PICKER_EVENT, handler);
}
