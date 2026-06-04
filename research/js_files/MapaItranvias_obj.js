var MapaItranvias = function(){
	
	this.mapa;

	this.marcas = new Array();

	this.lineaPath = new Array();
	this.paradasPath = new Array()
	this.busesPath = new Array()

	this.busesRefresco;
	this.mostrar_mensaje = true;

	this.setMapa = function(divMapa, options){


		var styles = [
		  {
		    stylers: [
		      { hue: "#F44336" },
		      { saturation: -50 }
		    ]
		  },{
		    featureType: "road",
		    elementType: "geometry",
		    stylers: [
		      { lightness: 100 },
		      { visibility: "simplified" }
		    ]
		  },{
		    featureType: "road",
		    elementType: "labels",
		    stylers: [
		      { visibility: "off" }
		    ]
		  }
		];


		MapaItranviasObj = this;
	  var map = new google.maps.Map(document.getElementById(divMapa), options);
	  map.setOptions({styles: styles});		

		MapaItranviasObj.mapa = map;	
	}
	
	this.creaMarcaParada = function(coords, icono, parada){
		MapaItranviasObj = this;
		MapaItranviasObj.marcas = [];
		var marker = new google.maps.Marker({
	    position: coords,
	    map: MapaItranviasObj.mapa,
	    parada: parada,
	    icon:icono
	  });	

	  marker.addListener('click',function(){


	  })
	  MapaItranviasObj.marcas.push(marker);


	}

	this.creaMarca = function(coords, mensaje,icono, parada){
		MapaItranviasObj = this;
		//Dadas unas coordenadas, mensaje e icono, crea un elemento Marker
		//en el Mapa.

  	var marker = new google.maps.Marker({
	    position: coords,
	    map: MapaItranviasObj.mapa,
	    parada: parada,
	    title: mensaje,
	    icon:icono
	  });	


	  MapaItranviasObj.addProximosParadaMapa(marker,'#modal-resultado-mapa')
	  MapaItranviasObj.marcas.push(marker);
	}
	


	this.creaMarcaUsuario = function(coords, mensaje, icono){
  	//Posición al usuario en el mapa
		MapaItranviasObj = this;
  	var marker = new google.maps.Marker({
	    position: coords,
	    map: MapaItranviasObj.mapa,
	    title: mensaje,
	    icon:icono
	  });	


	  MapaItranviasObj.marcas.push(marker);
	}


	//Dadas unas coordenadas, un numero de paradas y un radio,
	//devuelve un objeto JSON con el número de paradas solicitado
	//mas cercanas a la posición actual dentro del radio indicado 

	this.getCercanas = function(position, numparadas, radio,addToDiv){
		mapaItranvias_obj = this;
		mapaItranvias_obj.marcas = []
	  try{
	    posicion = position.coords.latitude+'_'+position.coords.longitude+'_'+radio+'_'+numparadas;

	    cercanasAjax = getQuery(3,posicion);
	    

	    cercanasAjax.done(function(data){

		    var cercanas = JSON.parse(data)
		    if(cercanas.resultado == "OK"){
		      	$(addToDiv).empty();
		      	if(cercanas.posgps.length > 0){
			      	paradas_cercanas.getParadas();

				    $.each(cercanas.posgps,function(key,value){
				        parada = paradas_cercanas.getParada(value.parada);
				        var coords = new google.maps.LatLng(Math.abs(parada.posy), parada.posx);

				        mapaItranvias_obj.creaMarca(coords,'('+parada.idParada+') '+parada.nombre,'img/icons/bus-stop.png',parada)
				        tarjeta_parada_cercana = paradas_cercanas.crearTarjetaParada(parada,null,'#template-tarjeta-parada-cercana')
				        tarjeta_parada_cercana.find('.metros').html(value.distancia+' mts')
				        tarjeta_parada_cercana.css('display','block')
				        tarjeta_parada_cercana.off('click')
						tarjeta_parada_cercana.click(function(){
					  		if(resultado_parada.refrescoResultado){
					      		clearTimeout(resultado_parada.refrescoResultado)
					  		}
							trackerAnalytics('Ventana Resultado')
							trackerEventAnalytics('Click','Parada Cercana')

				
							var codigo_parada = $(this).data('codparada')
							var parada = paradas.getParada(codigo_parada)
							$('.menu-div').hide();
								
					    	showLoading('Cargando info parada '+parada.idParada);
		            
				            resultado_parada.ajaxResultado(parada,'#resultado', '#template-tarjeta-tiempo' , '.tarjetas-tiempo-container',function(obj){
				              $('#content-message').hide();
				              $('#resultado').show();
				              $('#content-info').show()
				            })
				            addUltimasParadas(parada)
						});	        
				        tarjeta_parada_cercana.appendTo(addToDiv)
			      	})
				    MapaItranviasObj.setZoom(MapaItranviasObj.marcas, MapaItranviasObj.mapa,null)	      		
		      	}else{
		      		showMessage(traducir("lng-toast-no-cercanas","No disponde de paradas cercanas a su posición."),'ion-compass',addToDiv)

		      	}
			}else{
			    showMessage(traducir("lng-toast-error-cercanas","Error al intentar recuperar paradas cercanas")+' ('+cercanas.id_error+')','ion-compass',addToDiv)
			}

	    })
	    cercanasAjax.fail(function(data){
				showMessage(traducir("lng-toast-error-cercanas","Error al intentar recuperar paradas cercanas"),'ion-compass',addToDiv)

	    })

	  }catch(err){
	    showMessage(traducir("lng-toast-error-sae-cercanas","No ha sido posible recuperar la información. Disculpe las molestias"),'ion-compass',addToDiv)
	    
	          
	  }
	}



	this.setCenter = function(coords){
		MapaItranviasObj = this;
		MapaItranviasObj.mapa.setCenter(coords)
	}


	this.setZoom = function(arrayMarkers,map,zoom){
    /* Centrado de mapa en función de la posición y los
    marks creados */
		MapaItranviasObj = this;
    bounds = new google.maps.LatLngBounds();
  	$.each(arrayMarkers,function(a,b){
  		bounds.extend(b.getPosition());
  	})
  	
  	MapaItranviasObj.mapa.fitBounds(bounds);		
  	if(zoom != null){
			MapaItranviasObj.mapa.setZoom(zoom)

  	}
	}

	this.borraMarcasMapa = function(marcasArray){
		MapaItranviasObj = this;
		$.each(marcasArray,function(key,value){
			console.log(value)
			value.setMap(null)
		})
	}
	this.dibujaParadasMapa = function(paradasArray,icono){
		console.log(paradasArray)
		MapaItranviasObj = this;
		$.each(paradasArray,function(key, ruta){
			$.each(ruta, function(key, parada){

			
				var ParadaMarca = new Paradas();
				ParadaMarca.getParadas();
				paradaMarca = ParadaMarca.getParada(parada.id)
				var marker = new google.maps.Marker({
					position: new google.maps.LatLng(parseFloat(parada.posy), parseFloat(parada.posx)),
					map: MapaItranviasObj.mapa,
					icon:icono,
					parada: paradaMarca
				})

				MapaItranviasObj.addProximosParadaMapa(marker,'#modal-resultado-mapa')
				MapaItranviasObj.paradasPath.push(marker);
			})
		})  		

	}

	this.addProximosParadaMapa = function(marker, modalDivObj){
		MapaItranviasObj = this;

	  marker.addListener('click',function(){
		trackerEventAnalytics('Click','Marker parada mapa ')
	  	$(modalDivObj).find('.proximo-container').empty();

      resultado_cercanas.tiempoProximoBus(marker.parada,function(data){
      	resultado_cercanas.writeTarjetaTiempoProximo(JSON.parse(data),'#tarjeta-tiempo-proximo-template','.proximo-container');
      });
      
	  	$(modalDivObj).find('.nombre-parada').html(marker.parada.idParada +' - '+marker.parada.nombre);
    	$(modalDivObj).openModal();

	  })
	}

	this.dibujaBusesMapa = function(busesArray,icono){
		MapaItranviasObj = this;
		MapaItranviasObj.busesPath = []
		$.each(busesArray,function(key,sentido){
			$.each(sentido.buses, function(key,bus){
				//console.log(bus)
				var marker = new google.maps.Marker({
					position: new google.maps.LatLng(parseFloat(bus.posy), parseFloat(bus.posx)),
					map: MapaItranviasObj.mapa,
					zIndex: 9999,
					icon: icono
				})
				var infowindow = new google.maps.InfoWindow({
					content: "Bus "+bus.bus,
				})
				marker.addListener('click',function(){
					infowindow.open(MapaItranviasObj.mapa, marker)
				})
				MapaItranviasObj.busesPath.push(marker);
			})
		})
	}
	this.ajaxParadasBuses = function(lineaObj,callback){
		MapaItranviasObj = this;


		recorridosAjax = getQuery(99,lineaObj.idlinea+'&mostrar=PRB')
		recorridosAjax.done(function(data){
			try{

					datos = JSON.parse(data)
					callback(datos,recorridosAjax);	
				

			}catch(err){
				console.error(err)
				Materialize.toast(traducir('lng-toast-error-loading-paradas-mapa','Error recuperando paradas'),5000)
			}
		});
		recorridosAjax.fail(function(err){
			console.log(err);
			Materialize.toast(traducir('lng-toast-error-loading-paradas-mapa','Error recuperando paradas'),5000)
		});

		
	}


	this.ajaxBuses = function(lineaObj,callback){
		MapaItranviasObj = this;

		recorridosAjax = getQuery(99,lineaObj.idlinea+'&mostrar=B')

		recorridosAjax.done(function(data){
			try{
				datos = JSON.parse(data)
				callback(datos,recorridosAjax);	
				MapaItranviasObj.mostrar_mensaje = false;

			}catch(err){
				if(MapaItranviasObj.mostrar_mensaje == true){
					Materialize.toast(traducir('lng-toast-error-loading-buses-mapa','Línea sin servicio en este momento'),5000)	
				}
				MapaItranviasObj.mostrar_mensaje = false;
			}

			MapaItranviasObj.busesRefresco = setTimeout(function(){
				MapaItranviasObj.ajaxBuses(lineaObj,callback)	
			},15000)
			
		});

		recorridosAjax.fail(function(err){
			console.log(err);
			Materialize.toast(traducir('lng-toast-error-loading-buses-mapa','Error recuperando paradas'),5000)
			MapaItranviasObj.busesRefresco = SetTimeout(function(){
				MapaItranviasObj.ajaxBuses(lineaObj,callback)	
			},5000)
		});



	}

 	this.dibujaRecorridosMapa = function(lineaObj, recorridosArray){
 		//console.log(recorridosArray)

		$.each(recorridosArray, function(ruta,recorrido){
			var opacidadLinea =  1-((ruta*3)/10)
			var pathRecorridos = new Array()
			$.each(recorrido.posGps, function(key,latLng){
				pathRecorridos[key] = latLng;
				var boundsLinea = new google.maps.LatLngBounds();
				boundsLinea.extend(latLng)
			})
			var propiedades;
			if(ruta >1){
	  		var lineSymbol = {
			    path: 'M 0,-1 0,1',
			    strokeOpacity: 1,
			    scale: 4
				};	

				propiedades = {
					path: pathRecorridos,
					strokeColor: '#'+lineaObj.color,
	    		strokeOpacity : 0,
					icons: [{
			      icon: lineSymbol,
			      offset: '0',
			      repeat: '50px'
					}],				
	    		strokeWeight:2
				}
			}else{
				propiedades = {
					path: pathRecorridos,
					strokeColor: '#'+lineaObj.color,
	    		strokeOpacity : 1,
					strokeWeight:2
				}
			}


  		var dibujoLinea = new google.maps.Polyline(propiedades)
			dibujoLinea.setMap(MapaItranviasObj.mapa)

		})
	
	}


	this.dibujaLinea = function(lineaObj){
		MapaItranviasObj = this;
		var dibujoLinea;

		var recorridosArray = new Array()
		var paradasArray 		= new Array()
		var busesArray 		= new Array()

		
		

		try{
			MapaItranviasObj.ajaxParadasBuses(lineaObj,function(data, recorridosAjax){

				var posGpsArray = new Array();
				var posicion;
				var LatLng;

				
				$.each(datos.mapas[0].paradas, function(idRuta,value){
					paradasArray[idRuta] = new Array();
					$.each(value.paradas, function(key,parada){
						paradasArray[idRuta].push(parada)
					})

				})

				$.each(datos.mapas[1].recorridos, function(key,value){
					posicion = value.recorrido.split(' ');
					var posGpsArray = new Array();
					$.each(posicion, function(key,latLng){
						latLng = latLng.split(',');		
						posGpsArray[key] = (new google.maps.LatLng(parseFloat(latLng[1]), parseFloat(latLng[0])));
					})
					var recorridoObj= new Object();

					recorridoObj.sentido = value.sentido;
					recorridoObj.posGps 	= posGpsArray;
					recorridosArray.push(recorridoObj)
				})
				//console.log(recorridosArray)
				MapaItranviasObj.dibujaRecorridosMapa(lineaObj,recorridosArray);
				MapaItranviasObj.dibujaParadasMapa(paradasArray,'img/icons/bus-stop.png');
//				MapaItranviasObj.dibujaBusesMapa(busesArray, 'https://web.moovitapp.com/images/stations/mdpi/bus.png');

				$('.nombre-linea').click(function(){
					MapaItranviasObj.borraMarcasMapa(MapaItranviasObj.paradasPath)
				})

	 	    MapaItranviasObj.setZoom(MapaItranviasObj.paradasPath, MapaItranviasObj.mapa, null)
/*
				busesRecorrido      = datos.mapas[2].buses;
				busesArray[0] 			= busesRecorrido[0];
				busesArray[1] 			= busesRecorrido[1];

*/				MapaItranviasObj.ajaxBuses(lineaObj,function(data){
					busesRecorrido      = data.mapas[0].buses;
					busesArray[0] 			= busesRecorrido[0];
					busesArray[1] 			= busesRecorrido[1];
					MapaItranviasObj.borraMarcasMapa(MapaItranviasObj.busesPath)
					MapaItranviasObj.dibujaBusesMapa(busesArray, 'https://web.moovitapp.com/images/stations/mdpi/bus.png');		
				})

			})

			$('#modal-mapa-linea').find('.modal-close').click(function(){
				/* Al cerrar el mapa se cancela el refresco de los buses en 
				movimiento por el mapa */
				
				if(MapaItranviasObj.busesRefresco){
					clearTimeout(MapaItranviasObj.busesRefresco)
	      }
			})

		}catch(err){
			Materialize.toast(traducir('lng-toast-error-loading-linea-mapa','Error recuperando línea'),5000)
			console.log(err)

		}


	}


}