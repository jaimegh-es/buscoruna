var Paradas = function(){

	this.parada_info;
	this.objetoParadas;
	this.getParadasLinea;
	this.refrescoBuses;
	this.paradasAjax;
	this.ajaxObjectRefrescoActivo;
	this.ajaxObjectRefrescoLinea;
	
	this.saveParadasToStorage = function(paradasJson){
		objParadas = new Object();

		$.each(paradasJson, function(key,value){
			var parada = new Object();
			parada.idParada					= paradasJson[key].id;
			parada.nombre 					= paradasJson[key].nombre;
			parada.posx						= paradasJson[key].posx;
			parada.posy						= paradasJson[key].posy;
			parada.enlaces					= paradasJson[key].enlaces;
			objParadas[paradasJson[key].id] = parada;

		})
		var paradasJson = JSON.stringify(objParadas);
		localStorage.setItem("paradas",paradasJson);



	}
	this.getParadas = function(){

		this.objetoParadas = JSON.parse(localStorage.getItem("paradas"));	
		
	}

	this.getParada = function(cod_parada){
		paradasObj = this.objetoParadas;
		if(paradasObj === null || paradasObj[cod_parada] == undefined){
			console.log('No existe parada con el código: '+cod_parada)
			return false;

		}else{
			return paradasObj[cod_parada];

		}
		

	}
	this.crearTarjetaParada = function(parada,lineaObj,template){
		try{
			tarjeta_parada = $(template).clone(true,true);
			//var parada = paradas.getParada(value)
			tarjeta_parada.attr('id','parada-'+parada.idParada);

			if (template == "#template-tarjeta-favorito-parada" || template == "#template-tarjeta-favorito-parada-config"){
				tarjeta_parada.find('.nombre-parada').html(parada.nombre);
				tarjeta_parada.find('.codigo-parada').html(parada.idParada);

			}else if(template == "#template-tarjeta-parada"){
				tarjeta_parada.find('.nombre-parada').html('('+parada.idParada+') '+parada.nombre);
			
			}else if(template == "#template-tarjeta-parada-cercana"){
				tarjeta_parada.find('.nombre-parada').html(parada.nombre);
				tarjeta_parada.find('.parada').html(parada.idParada);
			}

			if(lineaObj !== null){

				color_linea = lineaObj.color

			}else{

				color_linea = 'F44336'

			}

			tarjeta_parada.find('.parada-point').css('background-color','#'+color_linea);			
			tarjeta_parada.attr('data-codparada',parada.idParada);
			$.each(parada.enlaces,function(i,v){
				lista_enlaces = $('#template-enlaces').clone(true,true);
				lista_enlaces.attr('id','');
				
				lineas.getLineas();
				linea = lineas.getLinea(v);
				lista_enlaces.html(linea.lin_comer);
				lista_enlaces.css('background-color','#'+linea.color);
				lista_enlaces.css('display','block');
				lista_enlaces.appendTo(tarjeta_parada.find('.enlaces-parada'));
			})
			tarjeta_parada.click(function(){
		  		if(resultado_parada.refrescoResultado){
		      		clearTimeout(resultado_parada.refrescoResultado)
		  		}	
				trackerAnalytics('Ventana Resultado')
				var codigo_parada = $(this).data('codparada')
				var parada = paradas.getParada(codigo_parada)
				$('.menu-div').hide();
				
				$('#paradas').show();
		      	showLoading(traducir("lng-msg-cargando-parada","Cargando info parada ")+ parada.idParada);
				resultado_parada.ajaxResultado(parada,'#tab-result','#template-tarjeta-tiempo','.tarjetas-tiempo-container',function(obj){
					$('#tab-result').show();
		        	$('#content-message').hide()
		        	$('#content-info').show()
		      		$('#li-tab-result').removeClass('disabled');
					$('#a-tab-result').click(); 

				})
				addUltimasParadas(parada)
			});
			return tarjeta_parada;
		}catch(e){
			console.error('*************************')			
			console.error('Error al ejecutar Paradas.crearTarjetaParada');
			console.error(e)
			console.error('*************************')
		}
	}



	this.writeHtml = function(lineaObj,template,addToDiv){
		paradasObj = this;

		paradasObj.ajaxObjectRefrescoActivo = true;
		paradasObj.ajaxObjectRefrescoLinea  = lineaObj.idlinea;		
		
		//console.log(lineaObj)
		var lista_paradas;
		var lista_enlaces;
		var texto = traducir("lng-txt-horarios-desde", "Horarios con salida desde ");
		
		rutaIda = lineaObj.rutas[0].paradas;
		rutaVue = lineaObj.rutas[1].paradas;
		$('#paradas-container-vuelta').empty()
		$('#paradas-container-ida').empty()
		$('#buses-container-vuelta').empty();
		$('#buses-container-ida').empty();
		$('#tarjetas-tiempo-container').empty()
		$('#paradas .bus-line').css('border-left-color','#'+lineaObj.color)
		
		$.each(rutaIda,function(key,value){
		

			var lista_paradas = paradas.crearTarjetaParada(paradas.getParada(value),lineaObj, template)
			lista_paradas.appendTo('#paradas-container-ida');
			lista_paradas.css('display','block');
			$('#ida .cabecera-direccion .nombre-linea').html(lineaObj.nombre_orig+' - '+lineaObj.nombre_dest)
			
			$('.direccion-ida').html(texto+' '+lineaObj.nombre_orig)

		})

		$.each(rutaVue,function(key,value){

			var lista_paradas = paradas.crearTarjetaParada(paradas.getParada(value),lineaObj, template)
			lista_paradas.appendTo('#paradas-container-vuelta');
			lista_paradas.css('display','block');
			$('#vuelta .cabecera-direccion .nombre-linea').html(lineaObj.nombre_dest+' - '+lineaObj.nombre_orig)			
			$('.direccion-vuelta').html(texto+' '+lineaObj.nombre_dest)

		})		
		$('.actualiza-buses i').off();
		$('.actualiza-buses i').on('click',function(){
		    try{
		      clearTimeout(paradas.refrescoBuses)
		    }catch(err){
		    	Materialize.toast('Error al intentar el refresco', 4000)
		    }			
	    	paradas.ajaxBuses(lineaObj.idlinea)
		})

		$('.cabecera-direccion .codigo-linea').html(lineaObj.lin_comer)
		$('.cabecera-direccion .codigo-linea').css('background-color','#'+lineaObj.color)
		
		$('.collapsible-header-paradas').off();
		$('.collapsible').collapsible();
		$('.collapsible-header-paradas').on('click',function(){

			existe = favorito_obj.existeFavorito(1, lineaObj.idlinea);

			//console.log(lineaObj.idlinea +' '+existe)
			if(existe == false){
				//El favorito no existe.
				//Crear opción de añadir a favoritos
				lineaHtml = $('.remove-fav-linea')
				lineaHtml.removeClass('remove-fav-linea').addClass('add-fav-linea')
				lineaHtml.find('.no-child').html('<i class="ion-ios-star-outline"></i> <span class="lng-menu-addfav">'+traducir("lng-menu-addfav","Añadir a favoritos")+'</span>')

				$('.add-fav-linea').off();
				$('.add-fav-linea').on('click',function(){
					closeCollapsible('#vuelta')
					closeCollapsible('#ida')
					closeCollapsible('#tab-result')
					closeCollapsible('#resultado')
		             trackerEventAnalytics('Click en Submenú', 'Añadir línea a favoritos');
					//console.log(lineaObj)
					//$('.cabecera-direccion').click()
					favorito_obj.setFavorito(1,lineaObj);
					lineaHtml = $('.add-fav-linea')
					lineaHtml.removeClass('add-fav-linea').addClass('remove-fav-linea')
					lineaHtml.find('.no-child').html('<i class="ion-ios-star-half"></i> <span class="lng-menu-delfav">'+traducir("lng-menu-delfav","**ELIMINAR")+'</span>')

				})

			}else{
				//El favorito ya existe
				//Crear opción de eliminar de favoritos.
				lineaHtml = $('.add-fav-linea')
				lineaHtml.removeClass('add-fav-linea').addClass('remove-fav-linea')
				lineaHtml.find('.no-child').html('<i class="ion-ios-star-half"></i> <span class="lng-menu-delfav">'+traducir("lng-menu-delfav","**ELIMINAR")+'</span>')
				$('.remove-fav-linea').off();
				$('.remove-fav-linea').on('click',function(){
					closeCollapsible('#vuelta')
					closeCollapsible('#ida')
					closeCollapsible('#tab-result')
					closeCollapsible('#resultado')
		            trackerEventAnalytics('Click en Submenú', 'Eliminar línea a favoritos');
					//console.log(lineaObj)
					//$('.cabecera-direccion').click()
					//favorito_obj.setFavorito(1,lineaObj);
					
					favorito_obj.borrarFavorito(1, lineaObj.idlinea)
					lineaHtml = $('.remove-fav-linea')
					lineaHtml.removeClass('remove-fav-linea').addClass('add-fav-linea')
					lineaHtml.find('.no-child').html('<i class="ion-ios-star-outline"></i> <span class="lng-menu-addfav">'+traducir("lng-menu-addfav","Añadir a favoritos")+'</span>')
		

				})
			}
		})

		$('.ver-mapa-linea').off();
		$('.ver-mapa-linea').on('click',function(){
			closeCollapsible('#vuelta')
			closeCollapsible('#ida')
			closeCollapsible('#tab-result')			
			$('#modal-mapa-linea').find('.nombre-linea').html(lineaObj.lin_comer+' - '+lineaObj.nombre_dest+' - '+lineaObj.nombre_orig).css('color','#'+lineaObj.color)
			$('#modal-mapa-linea').openModal();
            trackerEventAnalytics('Click en Submenú', 'Consultar mapa de línea');

			var options = {
        zoom: 10,
        center: {lat: 43.3619923, lng: -8.410475899999938},
        mapTypeControl: false,
        navigationControlOptions: {
          style: google.maps.NavigationControlStyle.SMALL
        },
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };

      mapa_linea = new MapaItranvias();
      mapa_linea.setMapa("mapa-linea",options)
      mapa_linea.dibujaLinea(lineaObj);

		})

		$('.ver-horarios-linea').off().on('click', function(){
			trackerEventAnalytics('Click en Submenú', 'Consultar horarios línea');

			closeCollapsible('#vuelta')
			closeCollapsible('#ida')
			closeCollapsible('#tab-result')
			var divObj = {
				container 				: '.horarios-container', 		
				modal 		 				: '#modal-horarios-linea',	
				codigoParada 			: '.logo-codigo-parada',
				fechaSolicitada 	: '.fecha-solicitada',
				nombreLinea 			: '#modal-horarios-linea .nombre-linea'
			}
			var sentido = 0;
			var horarios = 0;
			if($(this).hasClass('ida')){
				sentido = 0;
			}else if ($(this).hasClass('vue')){
				sentido = 1;
			}
			
			$(divObj.container).empty()
			$(divObj.modal).openModal();
			$(divObj.codigoParada).css('background-color','#'+lineaObj.color);
			

  		var picker = $('.datepicker').pickadate('picker');
  
  		picker.off('set')
			picker.on({
				
				open: function(){
					$('.picker__date-display').css('background-color', '#f44336');
					$('.picker__weekday-display').css('background-color', '#ee6e73');
					$('.picker__day--selected').css('background-color', '#ee6e73');
				},
				set: function(){
					if(this.get('select','yyyymmdd') == ''){
					 	this.set('select',new Date())
					}
					fecha = this.get('select','yyyymmdd')
					$(divObj.fechaSolicitada).html(traducir('lng-txt-horarios','Horarios para el día ') +' '+this.get('select','dd/mm/yyyy'));
					lineas.getHorarios(fecha, lineaObj, sentido, divObj);
					this.close()
				}
			})
			picker.set('select', new Date());
		})

	}



	this.ajaxBuses = function(linea){



		paradasObj = this;

		console.log('Empezando consulta')
		$('#ida, #vuelta').find('.ultima-actualizacion').html(traducir('lng-msg-actualizando','Actualizando...'))
		$('#ida, #vuelta').find('i.icono-refresco').toggleClass('ion-refresh ion-load-a')
		//$('.actualiza-buses i').
		try{
			paradasObj.paradasAjax = getQuery(2,linea);				 
			
			

			paradasObj.paradasAjax.fail(function(data){
				console.log(data)
				texto = traducir("lng-msg-ult-actualiza", "Última actualización")
				$('.actualiza-buses > .ultima-actualizacion').html(texto+' '+getHora())				
				if(data.status != "0"){
					$('.actualiza-buses > .ultima-actualizacion').html(traducir("lng-msg-error-actualiza", "Error en la actualización"))         	
					$('#ida, #vuelta').find('i.icono-refresco').toggleClass('ion-refresh ion-load-a')
					$('.actualiza-buses').addClass('error-ajax');
					if(paradas.refrescoBuses){
						clearTimeout(paradas.refrescoBuses)
					}

				}
				if(data.statusText == "abort"){
					console.log('ABORTADO')

				}
			})


			paradasObj.paradasAjax.done(function(data){
				texto = traducir("lng-msg-ult-actualiza", "Última actualización")

				$('.actualiza-buses > .ultima-actualizacion').html(texto+' '+getHora())
				$('#ida, #vuelta').find('i.icono-refresco').toggleClass('ion-refresh ion-load-a')

				if (data !== undefined){

					paradas.dibujaBus(JSON.parse(data))
					$('.actualiza-buses').removeClass('error-ajax');


				}else{
					console.log('Error.Se actulizará automaticamente')
					Materialize.toast('Error.Se actulizará automaticamente',5000)                        

				}
			})


			paradasObj.paradasAjax.always(function(data){

				if(data.status != "0"){
					paradas.refrescoBuses = setTimeout(function() { 
			    		paradas.ajaxBuses(linea);
			    	}, 15000); 	
				}				

			});

		}catch(err){
			//Materialize.toast('No se ha podido realizar AjaxBuses',1000)	
			console.log('Reiniciando refresco')

		}


	}

	this.dibujaBus = function(data){
			var buses = new Array();
			try{
				var buses_ida = data.paradas[0].paradas;
				var buses_vue = data.paradas[1].paradas;

			}catch(err){
				console.log('No existen buses en una de las direcciones')
			}





			$('#buses-container-vuelta').empty();
			$('#buses-container-ida').empty();

			if($('#ida').is(":visible")){
				longitud_linea = $('#paradas-container-ida').height()-50;
			}else{
				$('#ida').show()
				longitud_linea = $('#paradas-container-ida').height()-50;
				$('#ida').hide()
			}
			
			if(buses_ida){
				$.each(buses_ida,function( key,  paradas){
					//console.log(paradas)
					$.each(paradas.buses,function(i ,n ){

						if(n.distancia <= 1){
							posicion_linea = (n.distancia*longitud_linea)-3;

							bus_linea = $('#template-dibujo-bus').clone();
							bus_linea.find('.numero-bus').html(n.bus);
							switch(n.estado){
								case 1:
									color = "#1C212A"
									break;
								case 0:
									color = "#F44336"
									break;
								case 17:
									color = "#BDBDBD"
									break;
								case 16:
									color = "#FFA7A1"
									break;
							}
							bus_linea.css({'margin-top':posicion_linea+'px','display':'block','color':color});
							bus_linea.appendTo('#buses-container-ida');
						}else{
							console.log('No se ha podido mostrar el bus '+n.bus + ' Posicion Bus: '+n.distancia +' Longitud vue: '+longitud_linea)

						}


					})
				})
			}
			if($('#vuelta').is(":visible")){
				longitud_linea = $('#paradas-container-vuelta').height()-50;
			}else{
				$('#vuelta').show()
				longitud_linea = $('#paradas-container-vuelta').height()-50;
				$('#vuelta').hide()
			}



			if(buses_vue){				
				$.each(buses_vue,function( key,  paradas){
					//console.log(paradas)
					$.each(paradas.buses,function(i ,n ){


						if(n.distancia <=1){
							posicion_linea = (n.distancia*longitud_linea)-3;
							bus_linea = $('#template-dibujo-bus').clone();
							bus_linea.find('.numero-bus').html(n.bus);
							switch(n.estado){
								case 1:
									color = "#1C212A"
									break;
								case 0:
									color = "#F44336"
									break;
								case 17:
									color = "#BDBDBD"
									break;
								case 16:
									color = "#FFA7A1"
									break;
							}
							bus_linea.css({'margin-top':posicion_linea+'px','display':'block','color':color});
							bus_linea.appendTo('#buses-container-vuelta');

						}else{
							console.log('No se ha podido mostrar el bus '+n.bus)
							console.log('Posicion Bus: '+n.distancia)	
							console.log('Longitud vue: '+longitud_linea)	

						}


					})
				})
			}
	}



}