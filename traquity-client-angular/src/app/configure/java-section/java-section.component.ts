import {Component, inject, Signal, viewChild} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatRadioGroup, MatRadioModule} from '@angular/material/radio';
import {DownloadProgressComponent} from '../../../common/components/download-progress/download-progress.component';
import {ConfigureStore, ReadableConfigureStore} from '../store/configure.store';
import {JavaDownloadPhaseLabelPipe} from './java-download-phase-label.pipe';

/** The three options offered, of which only the first two can end up being the section's setting. */
export type JavaOption = 'automatic' | 'custom' | 'download';

@Component({
  selector: 'app-java-section',
  imports: [DownloadProgressComponent, JavaDownloadPhaseLabelPipe, MatButtonModule, MatIconModule, MatProgressBarModule, MatRadioModule],
  templateUrl: 'java-section.component.html',
  styleUrls: ['java-section.component.scss'],
})
export class JavaSectionComponent {

  protected readonly configureStore: ReadableConfigureStore = inject(ConfigureStore);

  private readonly optionGroup: Signal<MatRadioGroup> = viewChild.required(MatRadioGroup);

  /**
   * Runs what the picked option does and then re-asserts the group's value from the store, because a Material radio
   * checks itself on interaction while what is selected here is derived from the verified setting: 'Download
   * Corretto' is an action that never becomes the selection at all, and a pick that is cancelled or does not
   * verify leaves the selection where it was.
   */
  protected chooseOption(option: JavaOption): void {
    switch (option) {
      case 'automatic':
        this.configureStore.selectAutomaticJava();
        break;
      case 'custom':
        this.configureStore.pickJavaPath();
        break;
      case 'download':
        this.configureStore.showJavaLicenseNote();
        break;
    }
    this.optionGroup().value = this.configureStore.javaSelection();
  }
}
