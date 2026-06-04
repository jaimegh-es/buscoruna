var Enlaces = function(){


	this.enlaces;




	this.saveEnlacesToStorage = function(enlaces_lineas){

		if (enlaces_lineas !== undefined && enlaces_lineas !== null){

			localStorage.setItem('enlaces', JSON.stringify(enlaces_lineas))
		}


	}

	this.getEnlaces = function(){
		Enlaces = this;
		try{
			if(localStorage.getItem('enlaces')){
				Enlaces.enlaces = JSON.parse(localStorage.getItem('enlaces'))
				console.log('OK')
			}else{
				Enlaces.enlaces = null;	
			}			
		}catch(e){
			console.log('Error al tratar de inicializar los enlaces')
			Enlaces.enlaces = null;
		}

	}

	this.esTransbordoGratuito = function(ori, dest){



		Enlaces = this;

		texto = ""
		if(Enlaces.enlaces == null){
			txt = traducir("lng-txt-enlaces-null","No se ha podido cargar la información sobre transbordos. <br />Recargue los datos en el menú configuración e inténtelo de nuevo")
			texto = '<p><span class="lng-txt-enlaces-null">'+txt+'</span></p>'
			return texto;
		}
		if(ori == dest){
			txt = traducir("lng-txt-trans-nogratis", "Transbordo no gratuito dentro de la misma línea")
			texto = '<p><span class="lng-txt-trans-nogratis">'+txt+'</span></p>'
			return texto;
		}
		console.log(dest)
		console.log(ori)
		ori = parseInt(ori)
		dest = parseInt(dest)
		if(dest < ori){
			origen 	= lineas.getLinea(dest)
			destino = lineas.getLinea(ori)
		}else{
			origen 	= lineas.getLinea(ori)
			destino = lineas.getLinea(dest)			
		}
		var enlaces = Enlaces.enlaces;
		console.log(enlaces)
		if(lineas.objetoLineas == undefined){
			console.log('No existe paradas.objetoParadas')
			lineas = new Lineas();
			lineas.getParadas();
		}


		var permitido = [true, true, true, true]; 
					console.log(origen.idlinea);

		$.each(enlaces.origen, function(key,linea){
			console.log(linea.linea)
			if(origen.idlinea == linea.linea){

				if(linea.sentidos){
					console.log('linea.sentidos')
					$.each(linea.sentidos,function(key_sentido_ida,ida_sentido){
						 console.log("Sentido: "+ida_sentido.sentido)
						if(ida_sentido.destinos !== undefined){
							$.each(ida_sentido.destinos, function(key,value_destino){
								if(value_destino.linea == destino.idlinea){
									 console.log('Encontrado ->'+ value_destino.linea)
									$.each(value_destino.sentidos, function(key_sentido_vue, destino_sentido){
										 console.log('No Transborda en sentido '+destino_sentido)
										// console.log('Key_sentido_vue: '+key_sentido_vue)
										permitido[(ida_sentido.sentido*2)+destino_sentido] = false;

									})
								}
							})
						}
					})
				}

			}
		})
		console.log(permitido)

		if(dest < ori){
			origen 	= lineas.getLinea(ori)
			destino = lineas.getLinea(dest)

			permitido_swap = permitido[1];
			permitido[1] = permitido[2]
			permitido[2] = permitido_swap;
		}

		var lalineaMay 	= traducir("lng-txt-lalineaMay", "La línea ");
		var transborda 	= traducir("lng-txt-transborda", " transborda gratuitamente con la línea ");
		var condestino 	= traducir("lng-txt-destino", " con destino ");
		var lalineaMin  = traducir("lng-txt-lalineaMin", " la línea ");
		var nopermitido = traducir("lng-txt-trans-nopermi", "El transbordo gratuito no está permitido");
		console.log(destino)
		if(permitido[0] && permitido[1] && permitido[2] && permitido[3] ){
			texto ='<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'</p>'
		}else if(!(permitido[0] || permitido[1] || permitido[2] || permitido[3]) ){
			texto = '<p><span class="lng-txt-trans-nopermi">'+nopermitido+'</span></p>'
		}else if(permitido[0] && permitido[1]){
			//La línea de origen en sentido ida <span class="lng-txt-transborda">'+transborda+'</span> de destino
			texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_dest+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'</p>'

			if(permitido[2]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_dest+'</p>'
				//La línea de origen transborda gratuitamente lo la lilnea de detino en sentido ida
			};
			if(permitido[3]){

				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_orig+'</p>'
				//La línea de origen transborda gratuitamente lo la lilnea de detino en sentido vuelta
			};


		}else if(permitido[1] && permitido[3]){
			//La línea de origen transborda gratuitamente lo la lilnea de detino en sentido vuelta
			texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_orig+'</p>'

			if(permitido[0]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_dest+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'</p>'
				//La línea de origen en sentido ida <span class="lng-txt-transborda">'+transborda+'</span> de destino
			};
			if(permitido[2]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_orig+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'</p>'
				//La línea de origen en sentido vuelta <span class="lng-txt-transborda">'+transborda+'</span> de destino

			};
		}else if(permitido[2] && permitido[3]){
			//La línea de origen en sentido vuelta <span class="lng-txt-transborda">'+transborda+'</span> de destino
			texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_orig+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'</p>'

			if(permitido[0]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_dest+'</p>'
				//La línea de origen transborda gratuitamente lo la lilnea de detino en sentido ida

			};
			if(permitido[1]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_orig+'</p>'
				//La línea de origen transborda gratuitamente lo la lilnea de detino en sentido vuelta

			};

		}else{
			if(permitido[0]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_dest+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_dest+'</p>'
			};
			if(permitido[1]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_dest+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_orig+'</p>'
			}
			if(permitido[2]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_orig+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_dest+'</p>'
			}
			if(permitido[3]){
				texto = texto +'<p><span class="lng-txt-lalineaMay">'+lalineaMay+'</span> '+origen.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+origen.nombre_orig+' <span class="lng-txt-transborda">'+transborda+'</span> '+destino.lin_comer+'<span class="lng-txt-destino">'+condestino+'</span> '+destino.nombre_orig+'</p>'
			}

		}
		return texto;


	}

}