var Lineas = function(){
	

	this.objetoLineas;




	this.saveLineasToStorage = function(lineasJson){
		objLineas = new Object();
		
		$.each(lineasJson,function(key,value){
			var linea = new Object();
			linea.idlinea					= lineasJson[key].id;
			linea.lin_comer 				= lineasJson[key].lin_comer;			
			linea.nombre_orig 				= lineasJson[key].nombre_orig;
			linea.nombre_dest 				= lineasJson[key].nombre_dest;
			linea.color 					= lineasJson[key].color;
			linea.rutas 					= new Array();
			linea.rutas.push(lineasJson[key].rutas[0]);
			linea.rutas.push(lineasJson[key].rutas[1]);
			objLineas[key] = linea; 


		})
		var lineasJson = JSON.stringify(objLineas);
		localStorage.setItem("lineas",lineasJson);

	}

	this.crearTarjetaLinea = function(template, dataLinea){


		var tarjeta_linea = $(template).clone();



		tarjeta_linea.attr('id','linea-'+dataLinea.idlinea);
		tarjeta_linea.find('.codigo-linea').html(dataLinea.lin_comer).css('background-color',hexToRGB(dataLinea.color,100));
		tarjeta_linea.find('.datos-linea').css('background-color',hexToRGB(dataLinea.color,20));
		tarjeta_linea.find('.origen-linea').html(dataLinea.nombre_orig);
		tarjeta_linea.find('.destino-linea').html(dataLinea.nombre_dest);
		tarjeta_linea.attr('data-codlinea',dataLinea.idlinea);
		tarjeta_linea.css('display','block')
		$(tarjeta_linea).click(function(){
			trackerAnalytics('Ventana Paradas')

			try{
	          clearTimeout(paradas.refrescoBuses)
	          clearTimeout(resultado_parada.refrescoResultado)
	        }catch(err){
	        	console.log(err)
	        }

			$('.menu-div').hide();
			paradas.writeHtml(lineas.getLinea(dataLinea.idlinea),'#template-tarjeta-parada','#paradas-container')
			$('#paradas').show();
			$('#li-tab-result').addClass('disabled');				
			$('#a-tab-ida').click();
			$("body").scrollTop(0);
			paradas.ajaxBuses(dataLinea.idlinea);

		})

		return tarjeta_linea;

	}
	this.writeHtml = function(template,addToDiv){
		$(addToDiv).empty();
		lineasJson = this.objetoLineas;
		$.each(lineasJson,function(key,value){
			
			var linea = lineas.crearTarjetaLinea(template, value);

			
			
			linea.appendTo(addToDiv);


		})
		


	}
	this.getHorarios = function(fecha, lineaObj, sentido, divObj){
		$(divObj.container).empty()
		parametros = lineaObj.idlinea+'&fecha='+fecha;

		serviciosLinea = getQuery(8,parametros);
		serviciosLinea.done(function(data){
			horarios = JSON.parse(data);

			if(horarios.resultado == "OK"){
				console.log(data)

				switch(sentido){

					case(0):
						servicios = horarios.servicios[0].ida;
						$(divObj.nombreLinea).html('<span class="logo-codigo-parada">'+lineaObj.lin_comer+'</span> '+lineaObj.nombre_orig+' - '+lineaObj.nombre_dest);
						break;

					case(1):
						servicios = horarios.servicios[0].vuelta;
						$(divObj.nombreLinea).html('<span class="logo-codigo-parada">'+lineaObj.lin_comer+'</span> '+lineaObj.nombre_dest+' - '+lineaObj.nombre_orig);
						break;

					default:

						break;
				}
				for (var n=(servicios.length%5);n<5;n++) {
					servicios.push(9999);
				};
				console.log(servicios)
				var trElement;
				var tdHtml;
				$.each(servicios, function(n,servicio){
					tr = n%5;
					if(tr == false){ // Se crea una nueva fila.					
						trElement = $('#tr-template').clone();
						$(trElement).attr('id','').attr('style','display:block');
					}
					if (servicio == 9999) {
						tdHtml = '<td style="opacity:0;">'+formatHora(servicio)+'</td>'
					}
					else {
						tdHtml = '<td>'+formatHora(servicio)+'</td>'
					}
					$(trElement).append(tdHtml);
					$(trElement).appendTo(divObj.container)
				})
			}else{
				console.log(horarios)
				showMessage(traducir("lng-toast-err-horarios","No se han podido recuperar horarios para la fecha solicitada")+' '+horarios.id_error+')','ion-ios-calendar-outline','.horarios-container')				
			}


		})

		serviciosLinea.fail(function(data){
			showMessage(traducir("lng-toast-err-horarios","No se han podido recuperar horarios para la fecha solicitada"),'ion-ios-calendar-outline','.horarios-container')
						

			console.log(data)
		})

	}
	this.getLineas = function(){

		this.objetoLineas = JSON.parse(localStorage.getItem("lineas"));	
	}
	this.getLinea = function(cod_linea){
		var resultado_linea;

		lineasObj = this.objetoLineas;

		if (lineasObj === null){return null}
		$.each(lineasObj,function(key,value){
			if (value.idlinea == cod_linea){
				resultado_linea = value;
				return false;
				
			}
		})
		return resultado_linea;
	}



	function hexToRGB(hex,opacity){    
	    r =  parseInt(hex.substring(0,2), 16);
	    g    = parseInt(hex.substring(2,4), 16);
	    b =  parseInt(hex.substring(4,6), 16);

    	result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
	    return result;
	}
}