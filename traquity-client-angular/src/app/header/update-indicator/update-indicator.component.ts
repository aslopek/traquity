import {Component, inject, OnInit, Signal} from '@angular/core';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTooltip} from '@angular/material/tooltip';
import {GithubRelease} from './github-release.type';
import {UpdateCheckService} from './update-check.service';

@Component({
  selector: 'app-update-indicator',
  imports: [
    MatIconButton,
    MatIcon,
    MatTooltip,
  ],
  templateUrl: 'update-indicator.component.html',
  styleUrl: 'update-indicator.component.scss',
})
export class UpdateIndicatorComponent implements OnInit {

  private readonly updateCheckService: UpdateCheckService = inject(UpdateCheckService);
  protected readonly availableUpdate: Signal<GithubRelease | null> = this.updateCheckService.availableUpdate;

  ngOnInit(): void {
    this.updateCheckService.checkForUpdate();
  }

  protected openNewTab(url: string): void {
    window.open(url, '_blank');
  }
}
