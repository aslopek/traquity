import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'fileName'})
export class FileNamePipe implements PipeTransform {

  transform(path: string | null, extension?: string): string {
    const normalizedPath: string = this.normalize(path);
    const last: string = normalizedPath.slice(this.lastSeparatorIndex(normalizedPath) + 1);
    if (last === '') {
      return '';
    }
    if (extension !== undefined && last.endsWith(extension)) {
      return last;
    }
    return `${last}${extension ?? ''}`;
  }

  private lastSeparatorIndex(path: string): number {
    return Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  }

  normalize(path: string | null): string {
    return (path ?? '').replace(/[\\/]+$/, '');
  }
}
