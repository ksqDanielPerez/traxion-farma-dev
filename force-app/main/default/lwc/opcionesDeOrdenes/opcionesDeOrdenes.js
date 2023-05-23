import { LightningElement, wire, api, track } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';
import getCalendarioValidaciones from '@salesforce/apex/CalendarioDeValidacionesController.getCalendarioValidaciones';

export default class OpcionesDeOrdenes extends LightningElement {

    @wire(MessageContext)
    MessageContext

    isOrdinario = false;
    isNoOrdinario = false;
    isEspecial = false;
    isCalendar = false;
    diasDePedido;
    @api value = [];
    @api accountselected;
    @api isPedidoDay = false;

    isProgramasEspeciales = true;
    pedidos = 'No hay pedidos generados aún.';
    // fecha = '18 de abril 2023 - 7:00 a 16:00';
    @api fecha;
    @api hora;


    @wire(getCalendarioValidaciones, { accId: '$accountselected' }) calendarioValidaciones({ data, error }) {
        if (data && data.length > 0) {
            this.value = [];
            this.isPedidoDay = false;
            this.diasDePedido = data;

            this.diasDePedido.forEach((record) => {

                const dateString = record.Fecha__c;
                const [year, month, day] = dateString.split('-');
                const date = new Date(year, month - 1, day); // Note: month is zero-indexed in the Date constructor
                const formattedDate = `${month}/${day}/${year}`;
                this.value.push(formattedDate);



                //Si hoy es dia de Pedido Ordinario entrará aqui
                if (date.toDateString() === new Date().toDateString()) {
                    // console.log('Found a date that is equal to today!', date);



                    const hora_fin = new Date();
                    hora_fin.setHours(0, 0, 0, parseInt(record.Hora_de_Fin__c)); // replace 0s with the current date if necessary
                    const hora_inicio = new Date();
                    hora_inicio.setHours(0, 0, 0, parseInt(record.Hora_de_Inicio__c)); // replace 0s with the current date if necessary
                    const currentTime = new Date();

                    // console.log("currentTime:", currentTime);
                    // console.log("hora_inicio:", hora_inicio);
                    // console.log("hora_fin:", hora_fin);

                    //Verifica la hora 
                    if (currentTime.getTime() >= hora_inicio.getTime() && currentTime.getTime() <= hora_fin.getTime()) {
                        // console.log("La hora esta entrando");
                        this.isPedidoDay = true;
                    }
                }


            });

            //Si hoy no es dia de pedido, busca la siguiente fecha
            if (!this.isPedidoDay) {
                const today = new Date();
                const nextDateRecord = this.diasDePedido.find(record => new Date(record.Fecha__c) > today);

                if (nextDateRecord) {
                    const nextDateString = nextDateRecord.Fecha__c;
                    const [nextYear, nextMonth, nextDay] = nextDateString.split('-');
                    const nextDate = new Date(nextYear, nextMonth - 1, nextDay);
                    const formattedNextDate = `${nextMonth}/${nextDay}/${nextYear}`;
                    this.nextDate = formattedNextDate;
                    this.fecha = formattedNextDate;
                    console.log(nextDate, "Here is the next Date");

                    const hora_fin = new Date();
                    hora_fin.setHours(0, 0, 0, parseInt(nextDateRecord.Hora_de_Fin__c)); // replace 0s with the current date if necessary
                    const hora_inicio = new Date();
                    hora_inicio.setHours(0, 0, 0, parseInt(nextDateRecord.Hora_de_Inicio__c)); // replace 0s with the current date if necessary
                    const currentTime = new Date();

                    const startTimeString = hora_inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endTimeString = hora_fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    this.hora = `De ${startTimeString} hasta ${endTimeString}`;
                    console.log(this.hora, "Aqui esta la hora");
                }
            }

            console.log(this.diasDePedido, "Aqui vamos pues");
        } else if (error) {
            console.log(error);
            this.value = [];
            this.isPedidoDay = false;
            this.fecha = "";
            this.hora = "";


        } else {
            this.value = [];
            this.isPedidoDay = false;
            this.fecha = "";
            this.hora = "";
        }
    }

    handleCalendario() {
        console.log('AccountId: ' + this.accountselected);
        this.isCalendar = !this.isCalendar;
        console.log(this.isCalendar);
        this.value.forEach((record) => {
            console.log(record);
        });
    }

    handleShowPedidos(ordinario, noOrdinario, especial) {
        this.isGenerarPedidoOrdinario = ordinario;
        this.isGenerarPedidoNoOrdinario = noOrdinario;
        this.isGenerarPedidoEspecial = especial;
    }

    handleSolicitarPedidoOrdinario() {

        this.dispatchEvent(new CustomEvent('ordinario'));
    }

    handleSolicitarPedidosNoOrdinario() {
        this.dispatchEvent(new CustomEvent('nordinario'));
    }
    handlePedidoEspeciales() {
        this.dispatchEvent(new CustomEvent('especiales'));
    }

    seleccionarPedidoOrdinario() {
        this.handleShowPedidos(true, false, false);
    }

    seleccionarPedidoNoOrdinario() {
        this.handleShowPedidos(false, true, false);
    }

    seleccionarPedidoEspecial() {
        this.handleShowPedidos(false, false, true);
    }

    get pedidoOrdinarioStyle() {
        if (this.isGenerarPedidoOrdinario) return 'border: 1px solid #e6e6e6; box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(114, 114, 114, 0.19);';
    }
    get pedidoNoOrdinarioStyle() {
        if (this.isGenerarPedidoNoOrdinario) return 'border: 1px solid #e6e6e6; box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(114, 114, 114, 0.19);';
    }
    get pedidoEspecialStyle() {
        if (this.isGenerarPedidoEspecial) return 'border: 1px solid #e6e6e6; box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(114, 114, 114, 0.19);';
    }

}