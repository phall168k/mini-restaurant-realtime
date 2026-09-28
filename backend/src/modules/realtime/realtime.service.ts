import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RealtimeEventType } from '../../libs/constants/realtime-event.constant';

@Injectable()
export class RealtimeService {
    private readonly logger = new Logger(RealtimeService.name);

    private server?: Server;
    
    initialize(
        server: Server,
    ): void {
        this.server = server;

        this.logger.log(
            'Realtime service initialized',
        );
    }

    private getServer(): Server {
        if (!this.server) {
        throw new Error(
            'Realtime server has not been initialized',
        );
        }

        return this.server;
    }

    public emitToRole<T>( 
        roleName: string, 
        event: RealtimeEventType, 
        payload: T, 
    ) { 
        this.getServer() 
        .to(roleName) 
        .emit(event, payload); 
    }
}
