import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'filePreview',
})
export class FilePreviewPipe implements PipeTransform {
  transform(file: File | undefined | null): string | null {
    if (file == null) {
      return null;
    }
    return URL.createObjectURL(file);
  }
}
