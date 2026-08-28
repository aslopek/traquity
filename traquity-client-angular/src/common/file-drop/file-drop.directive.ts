import {Directive, EventEmitter, Input, Output, Signal, signal, WritableSignal} from "@angular/core";

/**
 * Turns its host element into a drop target for files.
 *
 * It emits every file that was dropped, in one list, and decides nothing about them: which types are acceptable and
 * what a refusal says belong to whoever renders the message. While `fileDropDisabled` is set, a drop is ignored and
 * the host is not marked as a drag target.
 *
 * `enter` and `leave` fire per element, so a pointer crossing a child of the host would otherwise read as having
 * left it. The depth counter is what keeps the drag state correct over a host with children.
 *
 * The boundary is a plain `@Input`/`@Output` pair on purpose: `input()` and `output()` need an injection context,
 * and a directive that can be constructed without one is a directive this project's node-environment suite can
 * exercise directly.
 */
@Directive({
  selector: "[appFileDrop]",
  host: {
    "(dragenter)": "onDragEnter($event)",
    "(dragover)": "onDragOver($event)",
    "(dragleave)": "onDragLeave($event)",
    "(drop)": "onDrop($event)",
    "[class.file-drop-over]": "isDragOver()",
  },
})
export class FileDropDirective {

  @Input()
  fileDropDisabled: boolean = false;

  @Output()
  readonly filesDropped: EventEmitter<File[]> = new EventEmitter<File[]>();

  private readonly dragOver: WritableSignal<boolean> = signal(false);
  private depth: number = 0;

  /** Whether a drag is currently over the host, which the host's own class binding renders. */
  readonly isDragOver: Signal<boolean> = this.dragOver.asReadonly();

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
   * Preventing the default is what stops the browser navigating away to the dropped file, which for this
   * application means replacing its own document.
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
