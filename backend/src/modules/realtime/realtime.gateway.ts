import { RealtimeService } from './realtime.service';
import { 
  ConnectedSocket, 
  MessageBody, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  OnGatewayInit, 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserResponseDto } from '../admin/system/user/dto/user-response.dto';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../admin/system/user/user.service';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: UserResponseDto
  }
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTNEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway 
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{

  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.initialize(server);
    this.logger.log(`Websocket Gateway initialized`);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Missing token: ${client.id}`);
        client.disconnect();
        return;
      } 

      const payload = await this.jwtService.verifyAsync<UserResponseDto>(token);
      client.data.user = payload;

      const user = await this.userService.findOneByUsername(payload.username);
      if (!user) {
        this.logger.warn(`Unauthorized: ${client.id}`);
        client.disconnect();
        return;
      }

      const roles = await user.roles;

      if (roles?.length) {
        const roleRooms = roles.map((role) => `role:${role.name}`);

        await client.join(roleRooms);

        this.logger.log(
          `Socket ${client.id} joined rooms: ${roleRooms.join(', ')}`,
        );
      }

      await client.join(`user:${payload.id}`);

      this.logger.log(`Connected: ${client.id} - User:${payload.username}`);

    } catch (error) {
      this.logger.warn(`Unauthorized socket connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;

    if (authToken) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;

    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    return undefined;
  }

  @SubscribeMessage('ping')
  handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: unknown,
  ) {
    return {
      event: 'pong',
      data: {
        message: 'Websocket is working',
        user: client.data.user,
        received: data,
      },
    };
  }
}
