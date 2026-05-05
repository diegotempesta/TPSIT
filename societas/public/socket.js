const ws = new WebSocket(`ws://${location.host}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {

        case 'new_post':
            console.log('Nuovo post', data.post);
            break;

        case 'new_comment':
            console.log('Nuovo commento', data);
            break;

        case 'update_post':
            console.log('Like/dislike aggiornati', data);
            break;

        case 'update_rating':
            console.log('Rating aggiornato', data);
            break;

        case 'update_profile':
            console.log('Profilo aggiornato', data);
            break;
    }
};