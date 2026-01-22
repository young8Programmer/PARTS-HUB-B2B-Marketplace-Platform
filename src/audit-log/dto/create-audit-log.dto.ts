import { IsUUID, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsUUID()
  userId: string;

  @IsString()
  action: string;

  @IsString()
  entity: string;

  @IsString()
  entityId: string;
}
