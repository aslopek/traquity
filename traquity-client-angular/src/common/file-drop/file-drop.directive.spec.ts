import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {FileDropDirective} from "./file-drop.directive";

/** The four handlers the host bindings reach, which are `protected` on the directive itself. */
type DragHandlers = {
  onDragEnter: (event: DragEvent) => void
  onDragOver: (event: DragEvent) => void
  onDragLeave: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
};

function fileFactory(name: string = "settlement.pdf"): File {
  return {name, type: "application/pdf"} as File;
}

describe("FileDropDirective", (): void => {

  let directive: FileDropDirective;
  let handlers: DragHandlers;
  let preventDefault: jest.Mock<() => void>;
  let dropped: File[][];
  let files: File[];

  function dragEvent(): DragEvent {
    return {preventDefault, dataTransfer: {files}} as unknown as DragEvent;
  }

  beforeEach((): void => {
    preventDefault = jest.fn();
    files = [fileFactory()];
    dropped = [];

    directive = new FileDropDirective();
    handlers = directive as unknown as DragHandlers;
    directive.filesDropped.subscribe((emitted: File[]): void => {
      dropped.push(emitted);
    });
  });

  it("emits the dropped file", (): void => {
    handlers.onDrop(dragEvent());

    expect(dropped).toEqual([files]);
  });

  it("emits every dropped file in one list, deciding nothing about them", (): void => {
    files = [fileFactory("first.pdf"), fileFactory("second.csv")];

    handlers.onDrop(dragEvent());

    expect(dropped).toEqual([files]);
  });

  it("emits nothing for a drop carrying no file at all", (): void => {
    files = [];

    handlers.onDrop(dragEvent());

    expect(dropped).toEqual([]);
  });

  it("prevents the default on a drop, which would otherwise navigate to the file", (): void => {
    handlers.onDrop(dragEvent());

    expect(preventDefault).toHaveBeenCalledWith();
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("prevents the default while dragging over, without which no drop happens", (): void => {
    handlers.onDragOver(dragEvent());

    expect(preventDefault).toHaveBeenCalledWith();
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  describe("the drag state", (): void => {

    it("is not set before a drag arrives", (): void => {
      expect(directive.isDragOver()).toBe(false);
    });

    it("is set once a drag enters", (): void => {
      handlers.onDragEnter(dragEvent());

      expect(directive.isDragOver()).toBe(true);
    });

    it("is cleared once the drag has left again", (): void => {
      handlers.onDragEnter(dragEvent());
      handlers.onDragLeave(dragEvent());

      expect(directive.isDragOver()).toBe(false);
    });

    it("survives a pointer crossing a child of the host", (): void => {
      handlers.onDragEnter(dragEvent());
      handlers.onDragEnter(dragEvent());
      handlers.onDragLeave(dragEvent());

      expect(directive.isDragOver()).toBe(true);
    });

    it("is cleared by the drop itself", (): void => {
      handlers.onDragEnter(dragEvent());
      handlers.onDrop(dragEvent());

      expect(directive.isDragOver()).toBe(false);
    });
  });

  describe("while disabled", (): void => {

    beforeEach((): void => {
      directive.fileDropDisabled = true;
    });

    it("emits nothing for a drop", (): void => {
      handlers.onDrop(dragEvent());

      expect(dropped).toEqual([]);
    });

    it("leaves the default in place, so the host is no drop target", (): void => {
      handlers.onDragOver(dragEvent());
      handlers.onDrop(dragEvent());

      expect(preventDefault).not.toHaveBeenCalled();
    });

    it("does not mark the host as a drag target", (): void => {
      handlers.onDragEnter(dragEvent());

      expect(directive.isDragOver()).toBe(false);
    });
  });
});
