import { LightningElement, api } from 'lwc';

export default class ProgramProgressIndicator extends LightningElement {

  @api selectedStep;

  connectedCallback() {
    this.selectedStep = "Step1";
  }
}