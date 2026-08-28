import {Directive, EventEmitter, Input, Output, signal, WritableSignal} from "@angular/core";

/**
 * Turns its host element into a drop target for files.
 *
 * It emits every file that was dropped, in one list, and decides nothing about them: which types are acceptable and
 * what a refusal says belong to whoever renders the message. While `fileDropDisabled` is set, a drop is ignored and
 * the host is not marked as a drag target.
 *
 * Marking the host as a drag target means setting the class `file-drop-over` on it, for as long as a drag is over
 * it. No styles for that class come with the directive: a host that defines none looks no different during a drag,
 * and the outline, background or border that says "drop it here" is whatever the host's own stylesheet gives it.
 *
 * `enter` and `leave` fire per element, so a pointer crossing a child of the host would otherwise read as having
 * left it. The depth counter is what keeps the drag state correct over a host with children.
 */
@Directive({
  selector: "[appFileDrop]",
  host: {
    "(dragenter)": "onDragEnter($event)",
    "(dragover)": "onDragOver($event)",
    "(dragleave)": "onDragLeave($event)",
    "(drop)": "onDrop($event)",
    "[class.file-drop-over]": "dragOver()",
  },
})
export class FileDropDirective {

  @Input()
  fileDropDisabled: boolean = false;

  @Output()
  readonly filesDropped: EventEmitter<File[]> = new EventEmitter<File[]>();

  /** Whether a drag is currently over the host, which the host's own class binding renders. */
  protected readonly dragOver: WritableSignal<boolean> = signal(false);
  private depth: number = 0;

  protected onDragEnter(event: DragEvent): void {
    if (this.fileDropDisabled) {
      return;
    }
    event.preventDefault();
    this.depth++;
    this.dragOver.set(true);
  }

  /** Without preventing the default here, the drop never happens at all. */
  protected onDragOver(event: DragEvent): void {
    if (this.fileDropDisabled) {
      return;
    }
    event.preventDefault();
  }

  protected onDragLeave(event: DragEvent): void {
    if (this.fileDropDisabled) {
      return;
    }
    event.preventDefault();
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) {
      this.dragOver.set(false);
    }
  }

  /**
   * Preventing the default prevents the browser from 'navigating', i.e. showing the dropped file instead of the application.
   */
  protected onDrop(event: DragEvent): void {
    if (this.fileDropDisabled) {
      return;
    }
    event.preventDefault();
    this.depth = 0;
    this.dragOver.set(false);

    const files: File[] = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) {
      this.filesDropped.emit(files);
    }
  }
}
