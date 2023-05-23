import { LightningElement, api } from 'lwc';

export default class ReplaneacionItem extends LightningElement {


    @api
    transporte;
    @api
    key;

    // Getters
    get setStatusStyle(){
        if(this.transporte.Status == 'Certificado'){
            return 'background-color: #23c38c; color: white; padding: 5px;';
        }
        else{
            return 'background-color: #8023c3; color: white; padding: 5px;';
        }
    }

    // Handle Methods
    handleTransporteData(event){

        console.log('Key: ' + this.key);
        const transporteUnico = new CustomEvent("transporte", {
            detail: this.transporte
        });

        this.dispatchEvent(transporteUnico);
        console.log('Tranporte Seleccionado: ' + JSON.stringify(this.transporte));

     }
}