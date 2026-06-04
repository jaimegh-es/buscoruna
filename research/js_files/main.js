
function getDateNow(){
    var fecha = new Date()
    var hora = fecha.getHours()
    var minuto = fecha.getMinutes()
    var segundo = fecha.getSeconds()
    if (hora < 10) {hora = "0" + hora}
    if (minuto < 10) {minuto = "0" + minuto}
    if (segundo < 10) {segundo = "0" + segundo}

    var fecha = new Date();
    var year = fecha.getFullYear();
    var month = fecha.getMonth()+1;
    var day = fecha.getDate();
    if (day < 10) {day = "0" + day}
    if (month < 10) {month = "0" + ''+month}


    return year+''+month+''+day+''+hora+''+minuto+''+segundo

}

function isoDateToHuman(fecha){
    fechaOriginal = fecha;

    fecha = fechaOriginal.split('T');
    dia   = fecha[0]
    hora  = fecha[1];

    fecha_local   = new Date(dia.substr(0,4), parseInt(dia.substr(4,2))-1, dia.substr(6,2), hora.substr(0,2), hora.substr(2,2), hora.substr(4,2), 0)

    dia  = fecha_local.toLocaleDateString('es-ES');
    hora = fecha_local.toLocaleTimeString('es-ES',{hour12:false});
    fecha = {dia: dia, hora: hora}

    return fecha;
}	


function isoToTimeStamp(fecha_iso){
  fecha_iso = fecha_iso.split('T');
  fecha = fecha_iso[0];
  hora  = fecha_iso[1];

  return new Date(fecha.substr(0,4), parseInt(fecha.substr(4,2))-1, fecha.substr(6,2), hora.substr(0,2), hora.substr(2,2), hora.substr(4,2), 0).getTime();
  

}
function getHora(){
    var fecha = new Date()
    var hora = fecha.getHours()
    var minuto = fecha.getMinutes()
    var segundo = fecha.getSeconds()
    if (hora < 10) {hora = "0" + hora}
    if (minuto < 10) {minuto = "0" + minuto}
    if (segundo < 10) {segundo = "0" + segundo}
    var time = hora + ":" + minuto + ":" + segundo
    return time;
}
function getFecha(){
    var fecha = new Date();
    var year = fecha.getFullYear();
    var month = fecha.getMonth()+1;
    var day = fecha.getDate();
    if (day < 10) {day = "0" + day}
    if (month < 10) {month = "0" + month}
   
    return fecha = day + "-" + month + "-" + year;
               
}
function hexToRGB(hex,opacity){    
    r = parseInt(hex.substring(0,2), 16);
    g = parseInt(hex.substring(2,4), 16);
    b = parseInt(hex.substring(4,6), 16);

    result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
    return result;
}
var formatNumber = {
 separador: ".", // separador para los miles
 sepDecimal: ',', // separador para los decimales
 formatear:function (num){
  num +='';
  var splitStr = num.split('.');
  var splitLeft = splitStr[0];
  var splitRight = splitStr.length > 1 ? this.sepDecimal + splitStr[1] : '';
  var regx = /(\d+)(\d{3})/;
  while (regx.test(splitLeft)) {
  splitLeft = splitLeft.replace(regx, '$1' + this.separador + '$2');
  }
  return this.simbol + splitLeft  +splitRight;
 },
 new:function(num, simbol){
  this.simbol = simbol ||'';
  return this.formatear(num);
 }
}
function formatHora(horaString){
  horaString = horaString.toString();
  while(horaString.length < 4){
    horaString = "0"+horaString;
  }
  hh = horaString.substr(0, 2);
  mm = horaString.substr(2, 4);
  hora = hh+':'+mm
  return hora;
}
function formatMoneda(precio){
  precioString = precio.toString();
  precio = precioString.split('.');
  if(precio[1]){
    centimos = precio[1];
    if(centimos.length = 0){
     return precio[0]+','+'00 €'; 
    }else if(centimos.length == 1){
      return precio[0]+','+centimos+'0 €';
    }else if (centimos.length == 2){
      return precio[0]+','+centimos+' €';
    }else if (centimos.length > 2){
      return precio[0]+','+centimos[0]+centimos[1]+' €';
    }
  }else{
    return precio[0]+','+'00 €'; 
  }
  
}
function changeIdioma(idioma){
    $('.idioma').removeClass('idioma-active');
    $('.'+idioma).addClass('idioma-active');
    localStorage.setItem('mensajesGuardados','')
    localStorage.setItem('idultimomensaje','0')
    setIdiomaPicker(idioma);
    getDataInicial('20160101T000000', idioma)
    trackerEventAnalytics('Click en Idioma', 'Idioma: '+idioma);


    getFile("idioma.json",function(data){
      
      
      localStorage.setItem("diccionario",JSON.stringify(data[idioma]));
      localStorage.setItem("idioma",idioma);
      traduccion = JSON.parse(localStorage.getItem("diccionario"));
      $('span[class^="lng"]').each(function(){
        clase = this.className;
        $('.'+clase).html(traduccion[clase])
        
      })
      traduccionManual(traduccion)
      inicializarInicioPicker();


    })


}
function traduccionManual(traduccion){
    $('input#search').attr("placeholder",traduccion["lng-input-codigo"])
    $('input#btn-buscar-codigo-parada').attr("value",traduccion["lng-btn-menu-buscar"])
    $('input#horarios-date').attr("value",traduccion["lng-txt-seleccion-fecha"])        
    $('input#buscador_desde').attr("placeholder",traduccion["lng-input-desde"])
    $('input#buscador_hasta').attr("placeholder",traduccion["lng-input-hasta"])
    $('.lng-txt-nofav').html(traduccion['lng-txt-nofav']);
    $('.lng-text-ultimas').html(traduccion['lng-text-ultimas']);
    $('.lng-txt-enparada').html(traduccion['lng-txt-enparada']);
    $('.datepicker').attr("placeholder",traduccion["lng-txt-seleccion-fecha"])
}
function getPositionGps(callback){
  if (navigator.geolocation) {
    Materialize.toast(traducir("lng-toast-localizando","Localizando..."),5000)
    navigator.geolocation.getCurrentPosition(
      function(position){
        //$('#buscador_desde').val(position.coords.latitude+','+position.coords.longitude)
        return callback(position);
      },
      function(error){
        //console.log(error)
        return callback(false);
      }
    );
    //$('#cercanas-container .mensaje').html('Buscando paradas cercanas <br /> <i class="ion-android-locate" />')

  } else {
    Materialize.toast('Error en la obtención de coordenadas')

  }

}
function traducir(etiqueta, texto_alternativo){
  var texto = texto_alternativo;
  try{
    diccionario = JSON.parse(localStorage.getItem("diccionario"));
    if (diccionario !== null && diccionario !== undefined){
      
      if(diccionario[etiqueta]){
        texto = diccionario[etiqueta];
      }else{
        texto = texto_alternativo
      }
    }
  }catch(err){
    texto = texto_alternativo
  }
  return texto;
}


function inicializaFormRuta(){
  var coruna = new google.maps.LatLng(43.3611957,-8.4154033);
  
  var defaultBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(43.310000,-8.4754033),
    new google.maps.LatLng(43.3911957,-8.3754033));
  
  var options = {
    bounds: defaultBounds,
    location: coruna,
    rankBy: google.maps.places.RankBy.DISTANCE,
  componentRestrictions: {country: 'es'}
  };
  
  
  var input = /** @type {HTMLInputElement} */(document.getElementById('buscador_desde'));
  var autocomplete = new google.maps.places.Autocomplete(input,options);
  
  var input = /** @type {HTMLInputElement} */(document.getElementById('buscador_hasta'));
  var autocomplete = new google.maps.places.Autocomplete(input,options);  
}
function setIdiomaPicker(idioma){

  try{
    $('#select-idioma').val(idioma);
  }catch(e){
    $('#select-idioma').val('gl');
  }
  $('#select-idioma').material_select();

}
function setInicioPicker(option){
try{
    $('#select-inicio').val(option);
  }catch(e){
    $('#select-inicio').val('li_codpar');
  }
  $('#select-inicio').material_select();

}
function inicializarInicioPicker(){
  li_codpar     = traducir("lng-btn-codigo", "Código de parada");
  li_cercanas   = traducir("lng-btn-cercanas", "Localización");
  li_favoritos  = traducir("lng-btn-fav", "Favoritos");
  li_lineas     = traducir("lng-btn-lineas", "Líneas");
  $('#select-inicio').empty();
  $('#select-inicio').append($("<option></option").attr("value",'li_codpar').text(li_codpar));
  $('#select-inicio').append($("<option></option").attr("value",'li_cercanas').text(li_cercanas));
  $('#select-inicio').append($("<option></option").attr("value",'li_favoritos').text(li_favoritos));
  $('#select-inicio').append($("<option></option").attr("value",'li_lineas').text(li_lineas));
  try{
    var configuracion = JSON.parse(localStorage.getItem("configuracion"))
    setInicioPicker(configuracion.inicio);
  }catch(e){
    setInicioPicker('li-codpar')
  }

  $('#select-inicio').material_select();

}
function inicializarIdiomaPicker(){
  $('#select-idioma').empty();
  $('#select-idioma').append($("<option></option").attr("value",'gl').text('Galego'));
  $('#select-idioma').append($("<option></option").attr("value",'es').text('Castellano'));
  $('#select-idioma').append($("<option></option").attr("value",'en').text('English'));
  $('#select-idioma').material_select();
}
function inicializarTransbordoPicker(lineas){
  $('#select-ida-transbordo, #select-vue-transbordo, #texto').empty()
  $('#select-ida-transbordo').append($("<option></option").attr("selected","").attr("disabled","").text(traduccion["lng-input-trans-desde"]));
  $('#select-vue-transbordo').append($("<option></option").attr("selected","").attr("disabled","").text(traduccion["lng-input-trans-hasta"]));
  $.each(lineas ,function(k,linea){
    $('#select-ida-transbordo').append($("<option></option").attr("value",linea.idlinea).text(linea.lin_comer)).css('color','#'+linea.color)
    $('#select-vue-transbordo').append($("<option></option").attr("value",linea.idlinea).text(linea.lin_comer)).css('color','#'+linea.color)
  })

  $('#select-ida-transbordo, #select-vue-transbordo').material_select();

}


function inicializarDatePicker(){

  $('.datepicker').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    //selectYears: 15, // Creates a dropdown of 15 years to control year
    maxDate: 30,
    monthsFull: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    weekdaysFull: ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sábado'],
    weekdaysShort: ['Dom', 'Lun', 'Mar', 'Mier', 'Jue', 'Vie', 'Sab'],
    showMonthsShort: false,
    showWeekdaysFull: false,
    formatSubmit: 'yyyymmdd',
    firstDay: 'Lunes',
    max: 30,
    today: 'Hoy',
    clear: "",
    close: "",    


  });
  

}

function addUltimasParadas(parada){
  //añadir el codigo de parada al array de ultimasParadas
  if(!localStorage.getItem('ultimasParadas')){
    ultimasParadas = new Array(10)
  }
  var existe = false;
  var posicion = null;
  $.each(ultimasParadas,function(key,ultima){
    if(ultima === undefined ||ultima === null ){
      existe = false;
      return;
    }else{
      if(ultima.idParada == parada.idParada){
        existe = true;
        posicion = key;
        return false;
      }            
    }
  })

  if (!existe) {
    ultimasParadas.pop();
    var paradaObj = {
      idParada : parada.idParada
    }
    ultimasParadas.unshift(paradaObj);
    //ultimasParadas.unshift(parada);
    localStorage.setItem('ultimasParadas',JSON.stringify(ultimasParadas));  
    getLastParadas(ultimasParadas, '#recientes-container', '#template-tarjeta-parada-cercana')
  }else{
    if(posicion !== null){
      p = ultimasParadas[posicion]

      ultimasParadas.splice(posicion, 1);
      ultimasParadas.unshift(p);
      
      localStorage.setItem('ultimasParadas',JSON.stringify(ultimasParadas));  
      getLastParadas(ultimasParadas, '#recientes-container', '#template-tarjeta-parada-cercana')
    }
  }



}

function inicializar(){

  /*  
  if($('#li_cercanas > a').hasClass('active')){
    dibujarMapa();
  }
  */



  /*


  */


  $('#form-calcula-ruta').submit(function( event ) {
    event.preventDefault();
    var url = 'https://maps.google.es/maps?'+$(this).serialize()
    window.open(url)
  });
  inicializarInicioPicker()


  $('#save-cercanas').off();
  $('#save-cercanas').on('click',function(){
    grabarParametroConfiguracion('numParadas', $('#range-paradas-cercanas').val())
  });
  $('#save-metros').off();
  $('#save-metros').on('click',function(){
    grabarParametroConfiguracion('metrosDist', $('#range-metros-cercanas').val())
  });   

  $('form#form-calcula-ruta').find('.getLocationDesde').off().on('click',function(){
    getPositionGps(function(miPosicion){
      if (miPosicion){
        $('#buscador_desde').val(miPosicion.coords.latitude+','+miPosicion.coords.longitude)  
      }else{
         Materialize.toast(traducir("lng-toast-error-localiza","Error en la obtención de coordenadas"),5000)
      }
    });
  })
  $('form#form-calcula-ruta').find('.getLocationHasta').off().on('click',function(){
    getPositionGps(function(miPosicion){
      if (miPosicion){
        $('#buscador_hasta').val(miPosicion.coords.latitude+','+miPosicion.coords.longitude)  
      }else{
         Materialize.toast(traducir("lng-toast-error-localiza","Error en la obtención de coordenadas"),5000)
      }
    });
  })

  inicializarDatePicker();

  $('.borrar-fav').click(function(){
    try{
      borrarFavoritos();
    }catch(err){
      Materialize.toast(traducir("lng-toast-error-borrar-fav","No se han podido eliminar los favoritos"),5000)
    }
    
  })

  $('.btn-codpar').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón búsqueda por código');
  });

  $('.btn-cercanas').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón paradas cercanas');
  });
  $('.btn-lineas').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón consulta líneas');
  });

  $('.btn-configuracion').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón configuracion');
  });
  $('.btn-calcula-ruta').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón calcula ruta');
  });
    $('.btn-transbordos').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón transbordos');
  });
  $('.btn-precios').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón consulta precios');
  });
    $('.btn-novedades').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón Novedades');
  });
  $('#open-left').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Abrir menú desplegable');
  });

  $('.btn-favoritos').on('click',function(){
    trackerEventAnalytics('Click en menú', 'Botón favoritos');
    $('#a-tab-fav-todos').click()   
    $('#li-tab-fav-todos').addClass('active') 
    $('#a-tab-fav-todos').addClass('active') 

  });
  
  $('.input-field').click(function(){
    hideHeader();
  })  

  $('#codpar').submit(function(event){
    trackerAnalytics('Ventana Resultado')
    trackerEventAnalytics('Click','Búsqueda directa por código') 
    try{

      event.preventDefault();
      if(resultado_parada.refrescoResultado){
          clearTimeout(resultado_parada.refrescoResultado)
      }
      var parada = paradas.getParada(parseInt($('#search').val(),10))
      $('.menu-div').hide();
      showLoading(traducir("lng-msg-cargando-parada","Cargando info parada")+parseInt($('#search').val(),10));

      resultado_parada.ajaxResultado(parada,'#resultado', '#template-tarjeta-tiempo' , '.tarjetas-tiempo-container',function(obj){
        $('#content-message').hide();
        $('#resultado').show();
        $('#content-info').show()

      }) 
      
      if(parada != false){
        addUltimasParadas(parada)  
      }
      
      $('input#search').val('');

    }catch(err){
      console.log(err)
      Materialize.toast(traducir("lng-toast-error-codpar","No se ha podido realizar la petición código parada"),5000)

    }
  })

  $('.btn-menu-div').click(function(){
    $('.menu-div').hide();
    closeCollapsibleParadas();
    try{

      if(paradas.refrescoBuses){
        clearTimeout(paradas.refrescoBuses);
        paradas.paradasAjax.abort();
        paradasObj.ajaxObjectRefrescoActivo = false;
        paradasObj.ajaxObjectRefrescoLinea  = 0;   
      }
      
      if(resultado_parada.refrescoResultado){
        clearTimeout(resultado_parada.refrescoResultado);  
        resultado_parada.resultadoAjax.abort();
        resultado_parada.ajaxObjectRefrescoActivo = false;
        resultado_parada.ajaxObjectRefrescoParametros = new Object();          
        console.log(resultado_parada.ajaxObjectRefrescoParametros)
      }
      
      
    }catch(err){
      console.log('+++++++')
      console.log(err)
    }
  })



  $('.hide-header').click(function(){
    hideHeader();
  })

  $('.show-header').click(function(){
    showHeader();
    if($(this).hasClass('show-map')){
      $('#header-menu').show();
    }
  })
  

  //Click en cualquier botón del menú superior//
  $('#header-wrap > div.menu > ul > li > a').click(function(){
    $('#content-message').hide();
    $('#content-info').show();
    $('.tarjetas-tiempo-container').empty();
    $('.resultado-container').hide();
    $('.cabecera-resultado').find('.nombre-parada').html('');
  })
  
}

function getLastParadas(ultimasParadas, addToDiv, template){
  paradas.getParadas();
  $(addToDiv).empty();
  $.each(ultimasParadas,function(key,paradaReciente){
    if(paradaReciente !== undefined && paradaReciente !== null && paradaReciente.idParada !== undefined){
      try{
        var parada = paradas.getParada(paradaReciente.idParada)
        var lista_paradas = paradas.crearTarjetaParada(parada, null, template);
        lista_paradas.find('.nombre-parada').html(paradaReciente.nombre);
        lista_paradas.unbind();
        lista_paradas.click(function(){
          hideHeader();
          event.preventDefault();
          $('#search').val(paradaReciente.idParada);
          $('#codpar').submit();

          trackerEventAnalytics('Click', 'Consulta por paradas recientes')

        })
        lista_paradas.appendTo(addToDiv);
        lista_paradas.css('display','block');   
        lista_paradas.addClass('mix');       

      }catch(e){
        
        console.log('No se ha podido recuperar los datos de la parada '+key+' - '+paradaReciente.idParada);
        console.log(e);

      }
    }

  })

  if ($(addToDiv).is(':empty')){
      texto = '<p><span class="lng-text-ultimas">'+traducir('lng-text-ultimas', 'No hay paradas recientes para mostrar')+'</span></p>'
      showMessage(traducir("lng-text-ultimas","No dispone de favoritos"),'ion-document',addToDiv)
      $('#recientes-container').find('span.texto').addClass('lng-text-ultimas');
      //$(addToDiv).html(texto)
      
  }  

}
function dibujarMapa(){
  
  $('#mapa-cercanas').remove();
  $('#cercanas').append('<div id="mapa-cercanas" style="top:55px;"></div>')
  getGeolocation();

  var options = {
    zoom: 12,
    center: {lat: 43.3619923, lng: -8.410475899999938},
    mapTypeControl: true,
    navigationControlOptions: {
      style: google.maps.NavigationControlStyle.SMALL
    },
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  mapa_cercanas = new MapaItranvias();
  mapa_cercanas.setMapa("mapa-cercanas",options)   
  google.maps.event.trigger(mapa_cercanas.mapa, 'resize');  
//watchId = navigator.geolocation.watchPosition(listo,error);

}

function redibujarMapa(mapa){
  
  dibujarMapa()
  setTimeout(function(){
    google.maps.event.trigger(mapa_cercanas.mapa, 'resize');  
    
  },500)
  
}
function recargarDatos(){


  fecha_peticion = "20160101T000000";
  try{
    if(localStorage.getItem('idioma')){
      idioma = localStorage.getItem('idioma');
    }else{
      idioma = 'gl'
    }
  }catch(e){
    idioma = 'gl'
  }
  
  localStorage.setItem('mensajesGuardados','')
  localStorage.setItem('idultimomensaje','0')
  var ultimoMensaje = 0;  
  if(getDataInicial(fecha_peticion, idioma)){
    Materialize.toast(traducir("lng-toast-recargar-datos-ok","Datos recargados correctamente"),5000)

  }else{
    Materialize.toast(traducir("lng-toast-recargar-datos-error","Error intentando recargar datos"),5000)
  }
}
function consultaTransbordo(){
  if(!enlaces){


  }

  if($('#select-ida-transbordo option:selected').val() !==""){
    var linea_origen = $('#select-ida-transbordo option:selected').val();
  }

  if($('#select-vue-transbordo option:selected').val() !==""){
    var linea_vuelta = $('#select-vue-transbordo option:selected').val();
  }

  if(linea_origen !== undefined && linea_vuelta !== undefined){
    esTranbordo = enlaces.esTransbordoGratuito(linea_origen, linea_vuelta);
    $('#texto-transbordos').html(esTranbordo)
  }else{
    console.log('Introduzca una línea de origen y una línea de destino para realizar la consulta.')
  }
  

}
function getDataInicial(fecha_peticion,idioma){
  
  try{
    if (localStorage.getItem('fecha_peticion_novedad')){
      fecha_peticion_novedad = localStorage.getItem('fecha_peticion_novedad')
    }else{
      //Enviar fecha 20160101T000000
      fecha_peticion_novedad = "20160101T000000"
    }
  }catch(err){
    Materialize.toast(traducir("lng-toast-error-fecha","No se ha encontrado fecha_peticion_novedad"),5000)
    fecha_peticion_novedad = "20160101T000000"
  }

  try{
    if(localStorage.getItem('idultimomensaje')){
      ultimoMensaje = localStorage.getItem('idultimomensaje');
    }else{
      localStorage.setItem('mensajesGuardados','')
      var ultimoMensaje = 0;
    }
    $('.'+idioma).addClass('idioma-active');



    var preloader = $('#preloader').clone()
    $('#lineas-container').html(preloader)
    parametros = fecha_peticion+'_'+idioma+'_'+ultimoMensaje+'_'+fecha_peticion_novedad
    peticion = getQuery(7,parametros);


    peticion.done(function(data) {

      datos = JSON.parse(data)
      if(datos.hasOwnProperty('iTranvias') && datos.iTranvias.hasOwnProperty('actualizacion')){
        console.log('Hay una versión nueva de los datos')
        localStorage.setItem('fecha_peticion',datos.fecha_peticion);
        if(datos.iTranvias.actualizacion.fecha){
          localStorage.setItem('fecha_peticion',datos.iTranvias.actualizacion.fecha); 
        }else{
          localStorage.setItem('fecha_peticion','20160101T000000');
          
        }
        
        localStorage.setItem('idioma',idioma);
        datos_lineas  = datos.iTranvias.actualizacion.lineas;
        datos_paradas = datos.iTranvias.actualizacion.paradas;
        enlaces_lineas = datos.iTranvias.actualizacion.enlaces;
        tarifas       = JSON.stringify(datos.iTranvias.actualizacion.precios);
        var mostrar_novedades = false;
        lineas.saveLineasToStorage(datos_lineas);
        paradas.saveParadasToStorage(datos_paradas);
        enlaces.saveEnlacesToStorage(enlaces_lineas);
        localStorage.setItem('tarifas', JSON.stringify(datos.iTranvias.actualizacion.precios))
        var divContent = {
          tarifas         : '#content-tarifas',    
          observaciones   : '#observaciones-tarifas',  
        }
        writeTarifasHtml(divContent, tarifas); 

      }


      lineas.getLineas();
      paradas.getParadas();
      enlaces.getEnlaces();
      if (lineas.objetoLineas === null){
        //TODO
        //Mostrar mensaje de error en caso de que no haya lineas
        console.log('lineas=== null')
      }else{
        lineas.writeHtml('#template-tarjeta-linea','#lineas-container');         
        inicializarTransbordoPicker(lineas.objetoLineas);
        
      }
      try{
        if(datos.hasOwnProperty('iTranvias') && datos.hasOwnProperty('fecha_peticion')){
          fecha_peticion_novedad = datos.fecha_peticion.substr(0,8)+'T'+datos.fecha_peticion.substr(-6);
          localStorage.setItem('fecha_peticion_novedad', fecha_peticion_novedad);
        }
      }catch(e){
        console.error(e)
      }

      try{
        if(datos.hasOwnProperty('iTranvias') && datos.iTranvias.hasOwnProperty('novedades')){

          var novedades = datos.iTranvias.novedades;
          if(localStorage.getItem('idultimomensaje')){
            ultimoMensaje = localStorage.getItem('idultimomensaje');
          }else{
            var ultimoMensaje = 0;
            localStorage.setItem('mensajesGuardados','')

          }

          if (localStorage.getItem('mensajesGuardados')){
            mensajesGuardados = JSON.parse(localStorage.getItem('mensajesGuardados'))
          }else{
            mensajesGuardados = new Array();
          }
          $.each(novedades,function(key, nuevoMensaje){
            if(parseInt(ultimoMensaje) < parseInt(nuevoMensaje.id) ){
              console.log('Nuevo Mensaje')
              localStorage.setItem('idultimomensaje',parseInt(datos.iTranvias.novedades[novedades.length-1].id))
              mensajesGuardados.push(nuevoMensaje)
              mostrar_novedades = true;
            }else{
              console.log('Sin mensajes nuevos')

            }
            $.each(mensajesGuardados, function(clave, mensaje){
              if(mensaje.id == nuevoMensaje.id){

                mensajesGuardados[clave] = nuevoMensaje;
              }
            })
          })
          try{
            localStorage.setItem('mensajesGuardados', JSON.stringify(mensajesGuardados))
          }catch(e){
            console.log(e)
          }
          

        }else{
          console.log('Sin datos de mensaje')
        }
        mensaje_obj.nuevoMensaje()

      }catch(e){
        console.log(e)
      }

      if ( window.location !== window.parent.location )
      {
        return true;
        // The page is in an iFrames
      }
      else {

        if(mostrar_novedades){$('.btn-novedades a').click()}
        // The page is not in an iFrame
     }
	    


    })

    peticion.fail(function(err) {
      try{
        lineas.getLineas();
        paradas.getParadas();
        enlaces.getEnlaces();
        mensaje_obj.nuevoMensaje();

        if (lineas.objetoLineas === null){

          console.log('lineas === null');
          showMessage(traducir("lng-toast-error-carga-lineas","No se han podido cargar líneas. Error 400"),'ion-bug','#lineas-container');

        }else{
          
          lineas.writeHtml('#template-tarjeta-linea','#lineas-container');          
          inicializarTransbordoPicker(lineas.objetoLineas);

        }


      }catch(e){
        console.log(e)
        showMessage(traducir("lng-toast-error-carga-lineas","No se han podido cargar líneas. Error 400"),'ion-bug','#lineas-container')

      }

      console.log(err)
      return false;



    })

    getFile("idioma.json",function(data){
      localStorage.setItem("diccionario",JSON.stringify(data[idioma]))
      localStorage.setItem("idioma",idioma);
      traduccion = JSON.parse(localStorage.getItem("diccionario"))
      $('span[class^="lng"]').each(function(){
        clase = this.className;
        $('.'+clase).html(traduccion[clase])

      })

      traduccionManual(traduccion)

    })    
    return true;
  }catch(err){
    
    Materialize.toast(traducir("lng-toast-error-datos-ini","Petición datos iniciales"),5000)

    return false;
  } 
}

function getIdioma(){
  inicializarIdiomaPicker()

  try{
    if(localStorage.getItem('idioma')){
      idioma = localStorage.getItem('idioma');
    }else{
      fecha_peticion = "20160101T000000"
      idioma = 'gl'
    }
  }catch(err){
    Materialize.toast(traducir("lng-toast-error-idioma","No se ha encontrado idioma"),5000)
    fecha_peticion = "20160101T000000"
    idioma = 'gl'

  }
  setIdiomaPicker(idioma)
  return idioma;
}
function getFile(url,callback){
  $.getJSON(url, function(json){
      callback(json)
  });
}
function getQuery(funcion,parametro){

    var datos;
    var state;
    var time = getHora();
    var server1 = $.ajax({
        type: "GET",
        url: "queryitr_v3.php?",
        timeout: '15000',
        cache: false,
        data: "dato="+parametro+"&func="+funcion,

    })  
    return server1;

}
function closeCollapsibleParadas(){
  /* Cierra todos los menus collapsible de la sección paradas */
  try{
    closeCollapsible('#vuelta')
    closeCollapsible('#ida')
    closeCollapsible('#tab-result')
    closeCollapsible('#resultado')


  }catch(e){
    console.log('Imposible ejecutar closeCollapsibleParadas')
  }
}

function closeCollapsible(idCollapsible){
  //Cierra los elementos con clase Collapsible. Se le pasa el id
  //del elemento que lo contiene.
  
  try{
    collapsibleHeader = $(idCollapsible).find('.collapsible-header')
    collapsibleBody   = $(idCollapsible).find('.collapsible-body')
    if(collapsibleHeader.hasClass('active')){
      collapsibleHeader.removeClass('active');
      collapsibleBody.hide();
      return true;


    }
  }catch(e){
    console.error("No se ha podido cerrar el elemento "+idCollapsible)
    console.error(e)
    return false;
  }

}
function hideHeader(){
  $( ".header-index" ).hide();
  $('#toolbar').css({'width':'56px','background-color':'white'})
  $('#toolbar').find('i').css('color','#1c212a')
  $('.menu').css('margin-left','50px');
  //$('#header-menu').show();
  $('#content').css('padding-top',$('div .menu').height())
};

function showHeader(){
  $( ".header-index" ).show();
  $('#toolbar').css({'width':'100%','background-color':'transparent'});
  $('#toolbar').find('i').css('color','white');
  $('.menu').css('margin-left','0px');
  //$('#header-menu').hide();
  $('#content').css('padding-top',$('#header-wrap').height())
};


function showMessage(mensaje,icono,addToDiv){
/*    $('#content-info').hide()
    $('#content-message').find('.icono').html('<span class="'+icono+'"></span>')
    $('#content-message').find('.texto').html(mensaje)
    $('#content-message').show()*/

    $(addToDiv).empty();
    $(addToDiv).append('<div id="content-message"><div id="message"><span class="icono"></span><span class="texto"></span></div></div>');

    $(addToDiv).find('.icono').html('<span class="'+icono+'"></span>')
    $(addToDiv).find('.texto').html(mensaje)

}

function showLoading(mensaje){

    $('#content-info').hide()
    $('#content-message').find('.icono').html('<div class="progress" style="background-color: #ee6e73 !important;margin-top:40px"><div class="indeterminate" style="background-color: rgba(238, 238, 238, 0.93) !important;"></div></div>')
    $('#content-message').find('.texto').html(mensaje)
    $('#content-message').show()

}

function borrarRecientes(){
  localStorage.removeItem('ultimasParadas');
  ultimasParadas = new Array (10);      
  localStorage.setItem('ultimasParadas',JSON.stringify(ultimasParadas));
  getLastParadas(ultimasParadas, '#recientes-container', '#template-tarjeta-parada-cercana')  
  Materialize.toast('Se han eliminado las paradas recientes.', 4000)
}
function borrarFavoritos(){

    console.log('borra fav')
    //event.preventDefault();
    localStorage.removeItem('favoritos')
    favorito_obj = new Favoritos();
    localStorage.setItem('favoritos',JSON.stringify(favorito_obj.favoritos))
    favorito_obj.getFavoritos();
    favorito_obj.writeHtml('#favoritos-container');
    Materialize.toast(traducir("lng-toast-borra-fav","Se han eliminado los favoritos"),5000)



}


function cargarConfiguracion(){

  var configuracion = JSON.parse(localStorage.getItem("configuracion"))


  if(localStorage.getItem("configuracion") === null){

    configuracion = {
      inicio:     "li_lineas",
      numParadas: "5",  
      metrosDist: "5000",   
    }

    localStorage.setItem("configuracion",  JSON.stringify(configuracion))

  }

  $('#metros-value').html($('#range-metros-cercanas').val())
  $('#range-metros-cercanas').on('change',function(){
    $('#metros-value').html($('#range-metros-cercanas').val())
  })
  $('#paradas-value').html($('#range-paradas-cercanas').val())
  $('#range-paradas-cercanas').on('change',function(){
    $('#paradas-value').html($('#range-paradas-cercanas').val())
  })
  try{
    favorito_obj.getFavoritos();
    var template = new Object();
    template.linea = '#template-tarjeta-favorito-linea-config';
    template.parada = '#template-tarjeta-favorito-parada-config';
    $('#favoritos-container-config').empty();
    favorito_obj.writeHtml('#favoritos-container-config',template);


    favoritosHtml = $('#favoritos-container-config').find('.tarjeta-favorito');
    $.each(favoritosHtml,function(key,fav){
      $(fav).removeClass('mix').unbind();
      
      $(fav).find('.btn-edit').off().on('click',function(){
        if($(fav).hasClass('tarjeta-favorito-parada')){
          var codParada = $(fav).attr('data-codparada');
          var nomParada = $(fav).find('.nombre-parada').html()
          
          $('#modal-config-fav-parada').openModal();
          $('#modal-config-fav-parada').find('input').attr('placeholder','Introduzca nombre')
          $('#modal-config-fav-parada').find('label').html('Parada '+codParada);
          $('#modal-config-fav-parada').find('input').val(nomParada);
          $('#modal-config-fav-parada').find('.btn-grabar').off().on('click',function(){
            var nomFav = $('#modal-config-fav-parada').find('input').val()
            if (nomFav == ""){
              $('#modal-config-fav-parada').find('p .mensaje').html(traducir("lng-txt-intro-val-ok","Introduzca un valor correcto"))
            }else{
              favorito_obj.editarFavorito(0, codParada, nomFav)  
              cargarConfiguracion()        
              favorito_obj.writeHtml('#favoritos-container');
              $('#modal-config-fav-parada').closeModal()
            }            
          })
        } 
      })

      $(fav).find('.btn-borrar').off().on('click',function(){
        if($(fav).hasClass('tarjeta-favorito-linea')){
          var codLinea = $(fav).attr('data-codlinea');
          favorito_obj.borrarFavorito(1, codLinea)
          cargarConfiguracion()
        }else if($(fav).hasClass('tarjeta-favorito-parada')){
          var codParada = $(fav).attr('data-codparada');
          favorito_obj.borrarFavorito(0, codParada)
          cargarConfiguracion()        
        } 
      })

    })

    //setInicioPicker(configuracion.inicio);
    $('#range-paradas-cercanas').val(configuracion.numParadas);
    $('#range-metros-cercanas').val(configuracion.metrosDist);

    //Desactiva el botón de inicio, y activa el que encuentra en
    //la opción de configuración.
    menu = $('.menu ul').find('li');
    $.each(menu,function(k,v){
      $(v).find('.active').removeClass('active');
    })
    $('#'+configuracion.inicio).find('a').addClass('active')

  }catch(e){
    $('#select-inicio').val(1);
    $('#range-paradas-cercanas').val(5);
    Materialize.toast(traducir('lng-toast-error-cargando-configuracion','Error cargando la configuracion'),5000)
    showMessage(traducir("lng-txt-nofav","No dispone de favoritos"),'ion-document','#favoritos-container')
    $('#favoritos-container').find('.text').addClass('lng-txt-nofav');
    console.log(e)
  }
  closeCollapsible('#configuracion')

}


function grabarParametroConfiguracion(clave, valor){

  if(clave !== undefined && valor !== undefined){

    try{
      var configuracion = JSON.parse(localStorage.getItem("configuracion"))
      configuracion[clave] = valor;
      localStorage.setItem("configuracion",  JSON.stringify(configuracion))

    }catch(e){

      Materialize.toast(traducir('lng-toast-error-grabando-configuracion','Error grabando la configuracion'),5000)



    }
    Materialize.toast(traducir('lng-toast-success-grabando','Grabación realizada correctamente'),5000)
  }

}
function writeTarifasHtml(divContent, tarifas){
  $(divContent.tarifas).empty();
  tarifas = JSON.parse(tarifas);
  $.each(tarifas.tarifas, function(key, tarifa){
    $(divContent.tarifas).append('<tr style="width:100%"><td style="width:80%;">'+tarifa.tarifa+'</td><td style="width:20%;text-align:right !important;">'+formatMoneda(tarifa.precio)+'</td></tr>');
  })
  $(divContent.observaciones).empty();
  $.each(tarifas.observaciones,function(key, nota){
    $(divContent.observaciones).append(nota)
    $(divContent.observaciones).append('<p>')

  })
}
