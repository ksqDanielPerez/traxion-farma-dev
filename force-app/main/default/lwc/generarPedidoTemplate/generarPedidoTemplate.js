import { LightningElement, wire, api} from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';

export default class GenerarPedidoTemplate extends LightningElement {
    tipoDePedido = '';

    connectedCallback(){
        this.susbcribeToMessageChannel();
    }

    @wire(MessageContext)
    messageContext;

    susbcribeToMessageChannel(){
        subscribe(
            this.messageContext,
            SET_GENERAR_PEDIDOS_MENU,
            (message) => this.handleMessage(message)
        );
    }

    handleMessage(message){
        if(message && message.isGenerarPedidos)
            this.tipoDePedido = '';
    }

    get isTipoDePedido(){
        const isOrdinario = this.tipoDePedido === 'Ordinario' || this.tipoDePedido === '';
        return {
            estado: !isOrdinario,
            size: isOrdinario ? 12 : 10,
            class: 'col-b'
        };
    }

    handlePedidoNoOrdinario(){
        this.tipoDePedido = 'No Ordinario';
        console.log('Tipo de pedido: ' + this.tipoDePedido);
        this.template.querySelector('c-generacion-de-pedidos-menu').pedidoNoOrdinario();
    }

    handlePedidoEspeciales(){
        this.template.querySelector('c-generacion-de-pedidos-menu').pedidosEspeciales();
    }

    handlePedidoOrdinario(event){ 
        this.tipoDePedido = event.detail;
        console.log('Tipo de pedido: ' + this.tipoDePedido);
        this.template.querySelector('c-generacion-de-pedidos-menu').pedidoOrdinario();
    }

    handleOnUrgencia(event){
        this.tipoDePedido = event.detail;
        console.log(JSON.stringify(event.detail));
    }
    handleOnSoporte(event){
        this.tipoDePedido = event.detail;
        console.log(JSON.stringify(event.detail));
    }
    handleOnExtraordinario(event){
        this.tipoDePedido = event.detail;
        console.log(JSON.stringify(event.detail));
    }

}