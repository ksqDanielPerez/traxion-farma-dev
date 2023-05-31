import { api, LightningElement, wire } from 'lwc';
import getUmu from '@salesforce/apex/UmuController.getUmu';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import { publish, subscribe, MessageContext } from 'lightning/messageService';
import umuRecordSelected from '@salesforce/messageChannel/umu_record_selected__c';
import orderType from '@salesforce/messageChannel/order_type__c';

export default class ListaUnidadMedica extends LightningElement {

    @wire(MessageContext)
    messageContext;

    @api userId;
    umuOptions;
    selectedUmus = '';
    payload = [];

    @wire(getRecord, {
        recordId: USER_ID,
        fields: ['User.Id', 'User.ContactId']
    }) wiredUser({ error, data }) {

        if (data) {
            this.userId = data.fields.Id.value;
            console.log('Contact Data: ' + JSON.stringify(data.fields.ContactId.value));
            this.dispatchEvent(new CustomEvent('userid', {
                detail: data.fields.ContactId.value
            }));
        } else if (error) {
            console.log(error);
        }
    }

    @wire(getUmu, { userId: '$userId' }) umuAssigned({ data, error }) {
        if (data) {
            this.umuOptions = data;
            console.log(data, "Aqui esta la data");
            // pasar la data de los umu
            this.dispatchEvent(new CustomEvent('umudata', {
                detail: data
              }));
            //this.selectedUmus = data[0].Id;
            //this.publishMessage();
        } else if (error) {
            console.log(error, "tenemos errores");
        }
    };

    publishMessage(){
        const payload = {
            selectedUmu: this.selectedUmus
        };
        publish(this.messageContext, umuRecordSelected, payload);
    }

    showMessage = false;
    isNoOrdinario = false;

    handleSelect(event) {
        this.selectedUmus = event.target.value;
        //this.publishMessage();
        if (this.selectedUmus == 'Seleccionar Unidad Medica') {
            this.showMessage = false;
            this.dispatchEvent(new CustomEvent('display', { detail: this.showMessage }));
        } else {
            this.showMessage = true;
            this.dispatchEvent(new CustomEvent('accountid', { detail: this.selectedUmus }));
        }
        const payload = {
            selectedUmu: this.selectedUmus
        };
        console.log('payload: ' + JSON.stringify(payload));
        publish(this.messageContext, umuRecordSelected, payload);

        const payload2 = {
            isNoOrdinario: this.isNoOrdinario
        };
        console.log('payload 0: ' +  payload.isNoOrdinario);
        publish(this.messageContext, orderType, payload2);
    }

    connectedCallback(){
        this.selectedUmus = 'Seleccionar Unidad Medica';
    }
    
}