import { LightningElement, track } from 'lwc';

export default class ProgramComponentsContainer extends LightningElement {
  @track selectedStep;
  @track umusSelected;
  @track orderType;
  @track maxDate;
  isStep1 = true;
  isStep2 = false;
  isStep3 = false;

  handleMenuBools(step1, step2, step3){
    this.isStep1 = step1;
    this.isStep2 = step2;
    this.isStep3 = step3;
  }

  handleIndicatorPosition(event) {
    this.selectedStep = event.detail;
    console.log('STEEEEEP: ' + this.selectedStep);
    this.handleMenuBools(false, true, false);
  }

  handleDataMedicalUnits(event) {
    this.selectedStep = event.detail.step;
    this.umusSelected = event.detail.umus;
    this.orderType = event.detail.orderType;
    this.maxDate = event.detail.maxDate;
    console.log('Container Step: ' + this.selectedStep);
    console.log('Container Umus: ' + this.umusSelected);
    console.log('Container orderType: ' + this.orderType);
    console.log('Container Date: ' + this.maxDate);
    this.handleMenuBools(false, false, true);
  }
}