import { track, api, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import getSuppliesByCode from '@salesforce/apex/SuppliesController.getSuppliesByCode';
import getSubalmacenById from '@salesforce/apex/SubalmacenController.getSubalmacenById';
import getProgramById from '@salesforce/apex/ProgramController.getProgramById';
import PROGRAM_CHANNEL from '@salesforce/messageChannel/setProgramMessageChannel__c';
import { publish, subscribe, MessageContext } from 'lightning/messageService';

export default class ProgramSupplieDetailModal extends LightningModal {

  @api productCode;
  isDataLoading = true;

  //Clave
  mproductCode = "";
  name = "";
  description = "";
  classificationSicora = "";
  classificationSimple = "";
  budget = "";

  //Programa
  programId = "";
  programCode = "";
  programName = "";
  programInventory = "";

  //Subalmacen
  subalmacenId = "";
  subalmacenName = "";
  subalmacenNo = "";

  connectedCallback() {
    this.getSupplie();
  }

  renderedCallback() {
    // console.log('Program Id: ' + this.programId);
    if(this.programId) this.getProgram();
    // console.log('Subalmacen Id:' + this.subalmacenId);
    if(this.subalmacenId) this.getSubalmacenById();
  }

  getSupplie() {
    getSuppliesByCode({ productCode: this.productCode })
    .then((result) => {;
      if(result) {
        if(result.Programa__c) this.programId = result.Programa__c;
        if(result.Subalmacen__c) this.subalmacenId = result.Subalmacen__c;
        this.name = result.Name;
        this.mproductCode = result.BP_Product_Code__c;
        this.budget = result.Partida_Presupuestal__c;
        this.classificationSicora = result.Sicora_Classification__c;
        this.classificationSimple = result.Simple_Classification__c;
        this.description = result.Description__c;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  getProgram() {
    getProgramById({ programId: this.programId })
    .then((result) => {
      if(result) {
        this.programCode = result.Programa_ID__c;
        this.programName = result.Name;
        this.programInventory = result.Inventario__c;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  getSubalmacenById(){
    getSubalmacenById({ subalmacenId: this.subalmacenId })
    .then((result) => {
      if(result) {
        this.subalmacenName = result.Name;
        this.subalmacenNo = result.Numero_de_Subalmacen__c;
      }
      this.isDataLoading = false;
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  handleClose() {
    this.close('done');
  }
}