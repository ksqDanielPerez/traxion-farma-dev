import { LightningElement } from 'lwc';

export default class Replaneacion extends LightningElement {

    data = [
        {
        "Id":"0410018804",
        "Status":"Certificado",
        "IdTransporte":"00002467182",
        "Delegacion":"TLALPAN",
        "UMU":"CMF TLALPAN",
        "Estado":"CIUDAD DE MÉXICO",
        "FechaEntrega":"03/ABR/23",
        "Transportista":{
                            "IdTransportista": "82137731323",
                            "Nombre": "Hulk",
                            "Telefono": "809-231-7231",
                            "Email": "Hulk@marvel.universo",
                            "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
                            "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg",
                            "Comentarios": [
                                    {"Descripcion": "Faltante 70 piezas en la clave 3234", "Fecha": "03/04/2023", "Hora": "2:34 PM", "IdContacto": "423452155", "Nombre": "Hulk"},
                                    {"Descripcion": "Estan siendo revisadas, se informara en breve.", "Fecha": "03/04/2023","Hora": "3:55 PM", "IdContacto": "315151", "Nombre": "Thor"}
                            ]
         
                        }
        },
        {
            "Id":"0521015578",
            "Status":"ENT.PARCIAL",
            "IdTransporte":"0000247513",
            "Delegacion":"ATLIXCO",
            "UMU":"CMF ATLIXCO",
            "Estado":"CIUDAD DE MÉXICO",
            "FechaEntrega":"03/ABR/23",
            "Transportista":{
                                "IdTransportista": "9328172934",
                                "Nombre": "Iron Man",
                                "Telefono": "909-232-2321",
                                "Email": "IronMan@marvel.universo",
                                "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
                                "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg"
                                // "Comentarios": []
                            }
        },
        {
            "Id":"0521019182",
            "Status":"Certificado",
            "IdTransporte":"0000241233",
            "Delegacion":"ATLIXCO",
            "UMU":"CMF ATLIXCO",
            "Estado":"CIUDAD DE MÉXICO",
            "FechaEntrega":"05/FEB/23",
            "Transportista":{
                                "IdTransportista": "9391242934",
                                "Nombre": "Spiderman",
                                "Telefono": "829-412-5664",
                                "Email": "Spiderman@marvel.universo",
                                "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
                                "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg",
                                "Comentarios": [
                                    {"Descripcion": "Faltante 10 piezas en la clave 5512", "Fecha": "04/24/2023", "Hora": "10:34 AM", "IdContacto": "444252155", "Nombre": "Spiderman"},
                                ]
                            }
        }
    ];
        

    // transporte = [
    //                {
    //                   "Id":"0410018804",
    //                   "Status":"Certificado",
    //                   "IdTransporte":"00002467182",
    //                   "Delegacion":"TLALPAN",
    //                   "UMU":"CMF TLALPAN",
    //                   "Estado":"CIUDAD DE MÉXICO",
    //                   "FechaEntrega":"03/ABR/23",
    //                   "Transportista": {
    //                        "IdTransportista": "82137731323",
    //                        "Nombre": "Hulk",
    //                        "Telefono": "809-231-7231",
    //                        "Email": "Hulk@marvel.universo",
    //                        "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
    //                        "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg" },
    //                    "Comentarios": [
    //                         {"Descripcion": "Faltante 70 piezas en la clave 3234", "Fecha": "03/04/2023", "Hora": "2:34 PM", "IdContacto": "423452155", "Nombre": "Thor"},
    //                         {"Descripcion": "Estan siendo revisadas, se informara en breve.", "Fecha": "03/04/2023","Hora": "3:55 PM", "IdContacto": "315151", "Nombre": "Hulk"}
    //                     ]
    //                 },
    //                 {
    //                     "Id":"0265515378",
    //                     "Status":"ENT.PARCIAL",
    //                     "IdTransporte":"0000247513",
    //                     "Delegacion":"ATLIXCO",
    //                     "UMU":"CMF ATLIXCO",
    //                     "Estado":"PUEBLA",
    //                     "FechaEntrega":"....",
    //                     "Transportista": {
    //                         "IdTransportista": "1321521321",
    //                         "Nombre": "Thor",
    //                         "Telefono": "909-232-2321",
    //                         "Email": "Thor@marvel.universo",
    //                         "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
    //                         "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg" }
    //                },
    //                {
    //                     "Id":"0410018678",
    //                     "Status":"ENT.PARCIAL",
    //                     "IdTransporte":"0000247113",
    //                     "Delegacion":"ATLIXCO",
    //                     "UMU":"CMF ATLIXCO",
    //                     "Estado":"PUEBLA",
    //                     "FechaEntrega":"....",
    //                     "Transportista": {
    //                         "IdTransportista": "9328172934",
    //                         "Nombre": "Capitan America",
    //                         "Telefono": "029-831-9137",
    //                         "Email": "CapitanAmerica@marvel.universo",
    //                         "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
    //                         "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg" }
    //                },
    //                {
    //                     "Id":"0521015578",
    //                     "Status":"ENT.PARCIAL",
    //                     "IdTransporte":"0000261233",
    //                     "Delegacion":"ATLIXCO",
    //                     "UMU":"CMF ATLIXCO",
    //                     "Estado":"PUEBLA",
    //                     "FechaEntrega":"....",
    //                     "Transportista": {
    //                         "IdTransportista": "83175128342",
    //                         "Nombre": "Iron Man",
    //                         "Telefono": "837-612-0021",
    //                         "Email": "IronMan@marvel.universo",
    //                         "FotoChecking": "https://www.shutterstock.com/image-vector/document-check-mark-sign-icon-260nw-349450415.jpg",
    //                         "Evidencia": "https://m.media-amazon.com/images/I/81fKIh7xi9L.jpg" }
    //                }
        
    //     ]};

    // Array and Object
    transporte = {};
    filtroTransporte = [];
    actualTransporte = {};
    actualTransportista = {};
    comentarios = [];
     
    // Bool
    isTransporte = false;
    isComment = false;
    activeSectionMessage = '';
    placeHolder = '';
    comentario = '';
    estatus = '';
    

    // Getters
    get isComentario(){
        if(!this.comentarios.length > 0){
            this.placeHolder = 'Comenta';
            return false;
        }else{
            this.placeHolder = 'Reply';
            return true;
        }
    }

    get options() {
        return [
            { label: 'Todos', value: 'Todos' },
            { label: 'Certificado', value: 'Certificado' },
            { label: 'Entidad Parcial', value: 'ENT.PARCIAL' }
        ];
    }

     connectedCallback(){
        
        let data = JSON.parse(JSON.stringify(this.data));
        this.transporte = [...data];

        this.filtroTransporte = this.transporte;
     }

     handleOnChangeTransporte(event){
        this.handleBuscarTransporte('transporte', event.target.value);
     }

     handleOnChangeDelivery(event){
        this.handleBuscarTransporte('delivery', event.target.value);
     }

     handleBuscarTransporte(tipo, Id){

        var transporteUnico = [];
        if(tipo == 'transporte'){
            transporteUnico = this.transporte.filter(item => {
                return item.IdTransporte == Id
            })
            
        }else{
            transporteUnico = this.transporte.filter(item => {
                return item.Id == Id
            })
        }

        if(this.isObjEmpty(transporteUnico)){
            this.filtroTransporte = this.transporte;
        }else{
            this.filtroTransporte = [...transporteUnico];
        }
     }

    isObjEmpty (obj) {
        return Object.keys(obj).length === 0;
    }

    handleSelectedTransporte(event){
        this.actualTransporte = event.detail;
        this.comentarios = [];
        
        this.actualTransportista = {
            IdTransportista: this.actualTransporte.Transportista.IdTransportista,
            Nombre: this.actualTransporte.Transportista.Nombre,
            Telefono: this.actualTransporte.Transportista.Telefono,
            Email: this.actualTransporte.Transportista.Email,
            FotoChecking: this.actualTransporte.Transportista.FotoChecking,
            Evidencia: this.actualTransporte.Transportista.Evidencia,
        }

        if(this.actualTransporte.Transportista.hasOwnProperty('Comentarios')){
            this.comentarios = this.actualTransporte.Transportista.Comentarios;
        }else{
            console.log('No Tiene comentarios.');
        }
        this.isTransporte = true;
    }

     handleToggleSection(event){
        this.activeSectionMessage =
            'Open section name:  ' + event.detail.openSections;
     }

     handleOnChange(event){
        this.comentario = event.target.value;
     }

     isUndefined(value){
        // if(typeof(value) === 'undefined')return true
        let isBool = typeof(value) == 'undefined' ? true: false; 
        return isBool;
     }

     handleAgregarComentario(event){
        let transporteId = event.currentTarget.dataset.id;

        if(!this.comentario){
            return;
        }

        const date = new Date();
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        today = mm + '/' + dd + '/' + yyyy;
        const listaComentario = this.comentarios.slice();

        const newComment = {
            Descripcion: this.comentario,
            Fecha: today,
            Hora: date.getHours() + ":" + date.getMinutes(),
            IdContacto: "7869432", 
            Nombre: this.actualTransportista.Nombre
        };
        listaComentario.push(newComment);
        this.comentarios = listaComentario;

        // get index of object
        const index = this.transporte.findIndex(item => item.Id === transporteId);

        this.transporte[index].Transportista.Comentarios = listaComentario;
        this.comentario = '';
    }


    handleOnChangeStatus(event){
        this.estatus = event.detail.value;

        var transportePorEstatus = [];

        if(this.estatus == 'Todos'){
            this.filtroTransporte = [...this.transporte];
            return;
        }
        console.log('Status: '+ this.estatus);
        transportePorEstatus = this.transporte.filter(item => {
            return item.Status == this.estatus
        })
        
        if(!this.isObjEmpty(transportePorEstatus)){
            this.filtroTransporte = [...transportePorEstatus];
        }
        
    }


}