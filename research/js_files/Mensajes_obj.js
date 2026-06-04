var Mensajes = function(){


	this.enlaces;

	this.nuevoMensaje = function(){
		Mensaje = this;
		$('#novedades').empty();
    	$('#novedades').html('<span style="font-size: 0.7em;text-align: center;black: red;">'+$('#version').html()+'</span>');

		try{


			if(localStorage.getItem('mensajesGuardados')){
				mensaje_json = JSON.parse(localStorage.getItem('mensajesGuardados'));
				ahora = new Date().getTime();

				mensaje_json_temporal = mensaje_json.slice();
				mensaje_json_temporal.reverse();
				
				$.each(mensaje_json_temporal,function(key,mensaje){
					if (mensaje.hasOwnProperty('caducidad')){
						caduca = isoToTimeStamp(mensaje.caducidad)
						if (caduca < ahora){
							console.log('El mensaje ya ha caducado')
							mensaje_json.splice(key, 1)
							return true;
						}
					}

					Mensaje.escribirMensaje('#novedades','#template-mensaje', mensaje)

				})
				localStorage.setItem('mensajesGuardados', JSON.stringify(mensaje_json))

			}

		}catch(e){
			console.log('Error al mostrar mensajes')
		}

	}

	this.escribirMensaje = function(divPadre,template, mensaje){



		var div_mensaje = $(template).clone();
		$(div_mensaje).attr('id','');
		$(div_mensaje).find('.title').html(mensaje.titulo);
		fecha = isoDateToHuman(mensaje.fecha)
		$(div_mensaje).find('.article').html(fecha.dia+' - '+fecha.hora);
		$(div_mensaje).find('.mensaje').html(mensaje.texto);
		$(divPadre).append(div_mensaje)
		$(div_mensaje).css('display', 'block');
	}
}