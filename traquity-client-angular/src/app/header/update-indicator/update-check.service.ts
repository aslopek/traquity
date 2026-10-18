import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal, Signal, WritableSignal} from '@angular/core';
import * as packageJson from '../../../../package.json';
import {GithubRelease} from './github-release.type';

const releasesUrl: string = 'https://api.github.com/repos/aslopek/traquity/releases/latest';

@Injectable({providedIn: 'root'})
export class UpdateCheckService {

  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly availableUpdateSignal: WritableSignal<GithubRelease | null> = signal<GithubRelease | null>(null);
  readonly availableUpdate: Signal<GithubRelease | null> = this.availableUpdateSignal.asReadonly();

  checkForUpdate(): void {
    this.httpClient.get<GithubRelease>(releasesUrl).subscribe({
      next: (release: GithubRelease): void => {
        const remoteVersion: string = release.tag_name.replace(/^v/, '');
        if (this.isNewerVersion(remoteVersion, packageJson.version)) {
          this.availableUpdateSignal.set(release);
        }
      },
      error: () => {
        // offline, rate-limited, or other problem - fail silently
      }
    });
  }

  private isNewerVersion(remote: string, current: string): boolean {
    const remoteParts: number[] = remote.split('.').map(part => Number(part));
    const currentParts: number[] = current.split('.').map(part => Number(part));
    const length: number = Math.max(remoteParts.length, currentParts.length);

    for (let i = 0; i < length; i++) {
      const remotePart: number = remoteParts[i] ?? 0;
      const currentPart: number = currentParts[i] ?? 0;
      if (remotePart !== currentPart) {
        return remotePart > currentPart;
      }
    }
    return false;
  }
}
