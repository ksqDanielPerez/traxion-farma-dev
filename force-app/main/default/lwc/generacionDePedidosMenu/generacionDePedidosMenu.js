import { LightningElement, wire, api} from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';

export default class GeneracionDePedidosMenu extends LightningElement {
 
    @api 
    pedidoNoOrdinario(){
        this.tipoDePedido = 'No Ordinario';
        this.handleSolicitarPedido();
    }

    @api
    pedidosEspeciales(){
        this.tipoDePedido = 'Especial';
        this.handleSolicitarPedido();
    }

    @api
    pedidoOrdinario(){
        this.tipoDePedido = 'Ordinario';
        this.handleSolicitarPedido();
    }

    selectedStep;

    connectedCallback() {
        this.selectedStep = "Step1";
    }

    // renderedCallback() {
    //     this.menuDisabled();
    // }

    get menuDisabled() {
        if(this.selectedStep == 'Step1') {
            return 'pointer-events: none;';
        } else {
            return '';
        }
    }

    @wire(MessageContext)
    messageContext;
    disable = true;

    isSolicitarPedidos = false;
    isPedidos = false;
    isGenerarPedidos = true;
    tipoDePedido = '';

    get generarPedidoBackgrounColor(){
       if(this.isGenerarPedidos){
        return 'background-color: #7C7C7C; font-weight: 400; color: white;' ;
       }else{
        return 'background-color: none'
       }
    }

    get solicitarPedidoBackgroundColor(){
        if(this.isSolicitarPedidos){
            return 'background-color: #7C7C7C; font-weight: 400; color: white;' ;
           }else{
            return 'background-color: none'
           }
    }

    get isPedidoBackgroundColor(){
        if(this.isPedidos){
            return 'background-color: #7C7C7C; font-weight: 400; color: white;' ;
           }else{
            return 'background-color: none'
           }
    }

    handleMenuBools(generarPedidos, solicitarPedidos, pedidos){
        this.isGenerarPedidos = generarPedidos;
        this.isSolicitarPedidos = solicitarPedidos;
        this.isPedidos = pedidos;
    }
    
    handleGenerarPedido(){
        console.log("INSIDE HANDLE GENERAR PEDIDO");
        this.selectedStep = "Step1";
        const payload = {
            isGenerarPedidos: true,
            isSolicitarPedidos: false,
            isPedidos: false
        }
        publish(this.messageContext, SET_GENERAR_PEDIDOS_MENU, payload);
        this.handleMenuBools(true, false, false);
    }

    handleSolicitarPedido(){
        this.selectedStep = "Step2";
        this.disable = false;
        const payload = {
            isGenerarPedidos: false,
            isSolicitarPedidos: true,
            isPedidos: false
        };

        publish(this.messageContext, SET_GENERAR_PEDIDOS_MENU, payload);
        this.handleMenuBools(false, true, false);
    }

    handlePedidos(){
        this.selectedStep = "Step3";
        const payload = {
            isGenerarPedidos: false,
            isSolicitarPedidos: false,
            isPedidos: true
        };
        publish(this.messageContext, SET_GENERAR_PEDIDOS_MENU, payload);
        this.handleMenuBools(false, false, true); 
    }

}