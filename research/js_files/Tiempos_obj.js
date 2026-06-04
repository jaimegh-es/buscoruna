var Tiempos = function(){

    var objeto_parada;
    var refrescoResultado;
    this.resultadoAjax;
    this.ajaxObjectRefrescoActivo;
    this.ajaxObjectRefrescoParametros = new Object();    

    this.writeTarjetaTiempo = function(data,parada_info,div_padre,template,addToDiv){
        codParada = parada_info.idParada;
        //console.log(parada_info)
        if(codParada != undefined){
            this.objeto_parada = parada_info;

            $('.tarjetas-tiempo-container').empty();
            data = JSON.parse(data);

            if(data.resultado == "OK"){
                if (parada_info){
                    $(div_padre).find('.nombre-parada').html('<b>'+codParada+'</b> -'+parada_info.nombre)
                    // $(div_padre +'.nombre-parada').html(parada_info.nombre)

                    if (data.buses.hasOwnProperty('lineas')){
                        $.each(data.buses.lineas,function(key,infolinea){
                            try{

                                linea_info = lineas.getLinea(infolinea.linea);
                                tarjeta_html = $(template).clone(true,true);
                                tarjeta_html.attr('id','');
                                tarjeta_html.find('.color-linea').css('background-color','#'+linea_info.color);
                                tarjeta_html.find('.datos-ubicacion, .bus-enparada').css('background-color',hexToRGB(linea_info.color,50));  
                                tarjeta_html.find('.tiempo-llegada').css('background-color',hexToRGB(linea_info.color,40));                                
                                tarjeta_html.find('.txt-cod-linea').html(linea_info.lin_comer);

                                
                                if(infolinea.buses[0]){
                                    if((infolinea.buses[0].tiempo) == 0){
                                        tarjeta_html.find('.no-parada').css('display','none');
                                        tarjeta_html.find('.en-parada').css('display','block');
                                        tarjeta_html.find('.txt-num-bus').html(infolinea.buses[0].bus);

                                    }else{
                                        tarjeta_html.find('.txt-num-bus').html(infolinea.buses[0].bus);
                                        tarjeta_html.find('.txt-distancia-bus').html(formatNumber.new(infolinea.buses[0].distancia)+' mts');
                                        var ultima_parada = paradas.getParada(infolinea.buses[0].ult_parada)

                                        tarjeta_html.find('.txt-parada-bus').html(ultima_parada.nombre);
                                        tarjeta_html.find('.txt-tiempo').html(infolinea.buses[0].tiempo+"'");
                                    }
                                }
                                for (var i = 1; i <= infolinea.buses.length-1; i++) {
                                    proximos_html = tarjeta_html.find('#template-proximos-buses').clone(true,true);
                                    proximos_html.attr('id','');
                                    bus = infolinea.buses[i];
                                    proximos_html.find('.prox-txt-num-bus').html(bus.bus);
                                    proximos_html.find('.prox-txt-distancia-bus').html(formatNumber.new(bus.distancia)+' mts');

                                    ultima_parada = paradas.getParada(bus.ult_parada)
                                    proximos_html.find('.prox-txt-parada-bus').html(ultima_parada.nombre);

                                    proximos_html.find('.prox-txt-tiempo').html(bus.tiempo+"'");
                                    proximos_html.css('display','block');
                                    proximos_html.appendTo(tarjeta_html.find('#lista-proximos-buses'));
                                }
                                tarjeta_html.appendTo($(div_padre).find(addToDiv))
                                //tarjeta_html.appendTo('div_padre' + addToDiv);
                                tarjeta_html.css('display','block');
                            }catch(err){}
                        })
                        var proximos = '<span class="visuallyhidden">Próximos.</span>';
                        $(div_padre).find(addToDiv).append(proximos)
                        $('.actualiza-resultado i').off();
                        $('.actualiza-resultado i').on('click',function(){
                            try{
                                clearTimeout(resultado_parada.refrescoResultado)
                            }catch(err){
                                console.log('Error al intentar el refresco', 4000)

                            }           
                            resultado_parada.ajaxResultado(parada_info,div_padre,template,addToDiv,function(){})
                        })


                    }else{
                        //TODO
                        //Mostrar que no existen servicios en la actualidad para esta parada
                        showMessage(traducir("lng-txt-no-servicios", "No existe servicios disponibles en este momento"),'ion-heart-broken',addToDiv)


                    }

         
                }else{
                    //TODO
                    //AVISO DE QUE NO EXISTE ESTE CÓDIGO DE PARADA
                    showMessage(traducir("lng-txt-no-parada", "La parada solicitada no existe"),'icon-parada',addToDiv)
                }



            }else{
                showMessage(traducir("lng-txt-error-sae-parada", "Error al solictar datos al servidor"),'ion-heart-broken',addToDiv)

            }

            $('.cabecera-parada').off();
            $('.collapsible').collapsible();
            $('.cabecera-parada').on('click',function(){

                existe = favorito_obj.existeFavorito(0, codParada);

                console.log(codParada +' '+existe)
                if(existe == false){
                    //El favorito no existe.
                    //Crear opción de añadir a favoritos
                    lineaHtml = $('.remove-fav-parada')
                    lineaHtml.removeClass('remove-fav-parada').addClass('add-fav-parada')
                    lineaHtml.find('.no-child').html('<i class="ion-ios-star-outline"></i> <span class="lng-menu-addfav">'+traducir("lng-menu-addfav","Añadir a favoritos")+'</span>')

                    $('.add-fav-parada').off();
                    $('.add-fav-parada').on('click',function(){
                        closeCollapsible('#vuelta')
                        closeCollapsible('#ida')
                        closeCollapsible('#tab-result')
                        closeCollapsible('#resultado')
                         trackerEventAnalytics('Click en Submenú', 'Añadir línea a favoritos');
                        console.log(codParada)
                        //$('.cabecera-direccion').click()
                        favorito_obj.setFavorito(0,parada_info);
                        lineaHtml = $('.add-fav-parada')
                        lineaHtml.removeClass('add-fav-parada').addClass('remove-fav-parada')
                        lineaHtml.find('.no-child').html('<i class="ion-ios-star-half"></i> <span class="lng-menu-delfav">'+traducir("lng-menu-delfav","**ELIMINAR")+'</span>')

                    })

                }else{
                    //El favorito ya existe
                    console.log('B')
                    //Crear opción de eliminar de favoritos.
                    lineaHtml = $('.add-fav-parada')
                    lineaHtml.removeClass('add-fav-parada').addClass('remove-fav-parada')
                    lineaHtml.find('.no-child').html('<i class="ion-ios-star-half"></i> <span class="lng-menu-delfav">'+traducir("lng-menu-delfav","**ELIMINAR")+'</span>')
                    $('.remove-fav-parada').off();
                    $('.remove-fav-parada').on('click',function(){
                        closeCollapsible('#vuelta')
                        closeCollapsible('#ida')
                        closeCollapsible('#tab-result')
                        closeCollapsible('#resultado')
                        trackerEventAnalytics('Click en Submenú', 'Eliminar línea a favoritos');
                        //$('.cabecera-direccion').click()
                        //favorito_obj.setFavorito(1,lineaObj);
                        
                        favorito_obj.borrarFavorito(0, codParada)
                        lineaHtml = $('.remove-fav-parada')
                        lineaHtml.removeClass('remove-fav-parada').addClass('add-fav-parada')
                        lineaHtml.find('.no-child').html('<i class="ion-ios-star-outline"></i> <span class="lng-menu-addfav">'+traducir("lng-menu-addfav","Añadir a favoritos")+'</span>')
            

                    })
                }
            })


            //window.abp.initialize();

            $('.add-fav-parada').off();
            $('.add-fav-parada').on('click',function(){

                trackerEventAnalytics('Click en Submenú', 'Añadir parada a favoritos');

                closeCollapsible('#resultado')                            
                $('.cabecera-parada').click()
                favorito_obj.setFavorito(0,parada_info);

            })                        
      
            $('.ver-mapa-parada').off();
            $('.ver-mapa-parada').on('click',function(){
                trackerEventAnalytics('Click en Submenú', 'Consultar mapa de parada');

                closeCollapsible('#resultado')
                $('#modal-mapa-parada').find('.nombre-parada').html(parada_info.nombre).css('color','black')
                $('#modal-mapa-parada').openModal();

                var options = {
                    zoom: 5,
                    center: {lat: 43.3619923, lng: -8.410475899999938},
                    mapTypeControl: false,
                    navigationControlOptions: {
                      style: google.maps.NavigationControlStyle.SMALL
                    },
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                };
                mapa_parada = new MapaItranvias();
                mapa_parada.setMapa("mapa-parada",options)
                //mapa_parada.dibujaLinea(lineaObj);
                var arrayParada = new Array(1);
                arrayParada[0] = new Array();
                parada_info.id = parada_info.idParada;
                arrayParada[0].push(parada_info)
                mapa_parada.dibujaParadasMapa(arrayParada,'img/icons/bus-stop.png');
                mapa_parada.setZoom(mapa_parada.paradasPath, mapa_parada.mapa, 18)

            })
            
            peticion.always(function(data){
              $(this).blur();

            }) 
            //console.log(data)            
        }else{
            showMessage(traducir("lng-txt-no-parada", "'Error <br /> La parada solicitada no existe'"),'icon-parada',addToDiv)
        }



    }	

    this.tiempoProximoBus = function(parada_info,callback){
        try{
            proximoBusAjax = getQuery(0,parada_info.idParada);                 

            proximoBusAjax.fail(function(data){
                busJson = new Object();
                busJson.resultado = 'ERROR';
                busJson.parada    = parada_info;
                busJson.error     = 'No se han recibido datos'
                callback(JSON.stringify(busJson))
         

            })
            


            proximoBusAjax.done(function(data){
                data = JSON.parse(data)
                busJson = new Object();
                busJson.resultado = 'OK';
                busJson.parada    = data.buses.parada;
                busJson.proximos = new Array();
                lineasData = data.buses.lineas
                if (lineasData !== undefined){
                    $.each(lineasData,function(key,value){
                        bus = new Object(); 
                        lineaComer = lineas.getLinea(value.linea);

                        bus.linea = lineaComer.lin_comer;
                        bus.color = lineaComer.color;
                        bus.bus = value.buses[0].bus;
                        bus.distancia = value.buses[0].distancia;
                        bus.estado = value.buses[0].estado;
                        if(value.buses[0].tiempo == 0){
                            bus.tiempo = traducir('lng-txt-enparada', 'En parada')
                        }else{
                            bus.tiempo = value.buses[0].tiempo+' min';
                        }
                        bus.ult_parada = value.buses[0].ult_parada;
                        busJson.proximos.push(bus);
                    })
                    
                    callback(JSON.stringify(busJson));

                }else{
                    busJson = new Object();
                    busJson.resultado = 'ERROR';
                    busJson.parada    = parada_info;
                    busJson.error     = 'No se han recibido datos'
                    callback(JSON.stringify(busJson))
                             
                }
            })

        }catch(err){
            busJson = new Object();
            busJson.resultado = 'ERROR';
            busJson.parada    = parada_info;
            busJson.error     = 'No se han recibido datos'
            callback(JSON.stringify(busJson))
                  
        } 

    }

    this.writeTarjetaTiempoProximo = function(data,template,addToDiv){
        try{
            $(addToDiv).empty();

            if (data.resultado == "OK"){
                
                $.each(data.proximos,function(key,value){
                    proximo_html = $(template).clone().attr('id','');
                    proximo_html.find('.enlaces-linea').html(value.linea).css('background-color','#'+value.color)
                    proximo_html.find('.numbus').html(value.bus);
                    proximo_html.find('.minutos').html(value.tiempo);
                    proximo_html.css('display','block');
                    proximo_html.appendTo(addToDiv);
  
                })

            }else{
/*                proximo_html = $(template).clone().attr('id','');
                proximo_html.html(data.error);
                proximo_html.css('display','block');
                proximo_html.appendTo(addToDiv);*/
                showMessage(traducir("lng-txt-error-sae-parada", "Error al solictar datos al servidor"), 'ion-ios-timer-outline', addToDiv)
            }
        }catch(err){
            showMessage(traducir("lng-txt-error-sae-parada", "Error al solictar datos al servidor"), 'ion-ios-timer-outline', addToDiv)

        }

    }
    this.ajaxResultado = function(parada_info,div_padre,template,addToDiv,callback){
        
        try{
            resultadoObj = this;
            resultadoObj.ajaxObjectRefrescoActivo = true;
            resultadoObj.ajaxObjectRefrescoParametros.parada_info = parada_info;
            resultadoObj.ajaxObjectRefrescoParametros.div_padre = div_padre;  
            resultadoObj.ajaxObjectRefrescoParametros.template = template;
            resultadoObj.ajaxObjectRefrescoParametros.addToDiv = addToDiv;
            resultadoObj.ajaxObjectRefrescoParametros.callback = callback;

        }catch(e){
            console.log(e)
        }

        $(div_padre).find('.ultima-actualizacion').html(traducir('lng-msg-actualizando','Actualizando...'))
        $(div_padre).find('i.icono-refresco').toggleClass('ion-refresh ion-load-a')
        
        try{
            resultadoObj.resultadoAjax = getQuery(0,parada_info.idParada);                 
            
            resultadoObj.resultadoAjax.fail(function(data){
                $(div_padre).find('i.icono-refresco').toggleClass('ion-refresh ion-load-a')
                $('.actualiza-resultado').addClass('error-ajax')

                $('.actualiza-resultado > .ultima-actualizacion').html(traducir("lng-msg-error-actualiza", "Error en la actualización"))     
                callback();
            })

            resultadoObj.resultadoAjax.done(function(data){
                $(div_padre).find('i.icono-refresco').toggleClass('ion-refresh ion-load-a')

                texto = traducir("lng-msg-ult-actualiza", "Última actualización")
                $('.actualiza-resultado > .ultima-actualizacion').html(texto+' '+getHora())
                
                resultado_parada.writeTarjetaTiempo(data,parada_info,div_padre,template,addToDiv);
                $('.actualiza-resultado').removeClass('error-ajax')
                callback();
       
            })
            

            resultadoObj.resultadoAjax.always(function(data){
                  if(parada_info != false){
                  
                    resultado_parada.refrescoResultado = setTimeout(function() { 
                        resultado_parada.ajaxResultado(parada_info,div_padre,template,addToDiv,function(){});
                    }, 15000);   
                  }else{

                    resultadoObj.resultadoAjax.abort();
                    $(div_padre).find('.nombre-parada').html(traducir("lng-txt-no-parada", "La parada consultada no existe"))

                  }

                // if(data.status != "0"){
                //     resultado_parada.refrescoResultado = setTimeout(function() { 
                //         resultado_parada.ajaxResultado(parada_info,div_padre,template,addToDiv,function(){});
                //     }, 15000);   

                // }
            });

        }catch(err){
        }

    }
}