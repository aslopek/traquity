import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'fileDirectory'})
export class FileDirectoryPipe implements PipeTransform {

  transform(path: string | null): string {
    const normalizedPath: string = this.normalize(path);
    const separatorIndex: number = this.lastSeparatorIndex(normalizedPath);
    if (separatorIndex < 0) {
      return '';
    }
    const directory: string = normalizedPath.slice(0, separatorIndex);
    // a name directly under a root keeps that root's separator: '' and 'C:' name no directory, '/' and 'C:\' do
    return this.isRoot(directory) ? normalizedPath.slice(0, separatorIndex + 1) : directory;
  }

  private isRoot(directory: string): boolean {
    return directory === '' || /^[A-Za-z]:$/.test(directory);
  }

  private lastSeparatorIndex(path: string): number {
    return Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  }

  private normalize(path: string | null): string {
    return (path ?? '').replace(/[\\/]+$/, '');
  }
}
