import { LightningElement, wire } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';

export default class GenerarPedidoTipoDeOrden extends LightningElement {

    @wire(MessageContext)
    messageContext;

    isUrgente = false;
    isSoporteDeVida = false;
    isExtraordinario = false;
    isEmergencia = false;
    isUnidadMedica = true;

    handleOnUrgente(){
        this.handleOpciones(true, false, false, false);
        this.dispatchEvent(new CustomEvent('urgencia', {
            detail: 'Urgencia Médica'
        }));
        
        // Urgencia Médica, Soporte de Vida, Extraonidario
    }

    handleOnSoporteDeVida(){
        this.handleOpciones(false, !this.isSoporteDeVida, false, false);
        this.dispatchEvent(new CustomEvent('soporte', {
            detail: 'Soporte de Vida'
        }));
    }

    handleOnExtraordinario(){
        this.handleOpciones(false, false, true, false);
        this.dispatchEvent(new CustomEvent('extraordinario', {
            detail: 'Extraordinario'
        }));
    }

    handleOnEmergencia(){
        this.handleOpciones(false, false, false, true);  
    }

    get OnUrgenteBorder(){
        if(this.isUrgente){
            return 'border: 1px solid #e6e6e6;';
        }else {
            return 'border: none;';
        }
    }

    get OnSoporteBorder(){
        if(this.isSoporteDeVida){
            return 'border: 1px solid #e6e6e6;';
        }else {
            return 'border: none;';
        }
    }

    get OnExtraordinarioBorder(){
        if(this.isExtraordinario){
            return 'border: 1px solid #e6e6e6;';
        }else {
            return 'border: none;';
        }
    }

    get OnEmergenciaBorder(){
        if(this.isEmergencia){
            return 'border: 1px solid #e6e6e6;';
        }else {
            return 'border: none;';
        }
    }
    
    handleOpciones(urgente, soporte, extraordinario, emergencia){
        this.isUrgente = urgente;
        this.isSoporteDeVida = soporte;
        this.isExtraordinario = extraordinario;
        this.isEmergencia = emergencia;
    }

    susbcribeToMessageChannel(){
        subscribe(
            this.messageContext,
            SET_GENERAR_PEDIDOS_MENU,
            (message) => this.handleMessage(message)
        );
    }

    handleMessage(message){
        if(message.isSolicitarPedidos || message.isPedidos){
            this.isUnidadMedica = true;
            this.isPedidos = true;
        }else{
            this.isUnidadMedica = false;
            this.isPedidos = false;
        }
    }

    connectedCallback(){
        this.susbcribeToMessageChannel(); 
    }

    renderedCallback(){
        const elementMargin = [
            ...this.template.querySelectorAll('[data-element="lightning-icon-fixed"]'),
        ].forEach((element) => {
                element.style.margin = '18px';
        });    

        const iconColor = [
            ...this.template.querySelectorAll('[data-color="lightning-icon-color"]'),
        ].forEach((element) => {
                element.style.background = '#39cf71';
                
                // #68ed9a
        });    


    }

}