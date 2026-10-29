import { JwtService } from '@nestjs/jwt';
import { InternalUserGuard } from './internal-user.guard';
import { InternalAgentController } from './internal-agent.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('InternalUserGuard', () => {
  const secret = 'test-only-internal-user-secret';
  const jwt = new JwtService();
  const auth = { getProfile: jest.fn() };
  const guard = new InternalUserGuard(jwt, auth as any);
  const context = (authorization?: string) => {
    const request: any = { headers: { authorization, 'x-customer-id': 'victim' }, body: { customer_id: 'victim', role: 'ADMIN' } };
    return { request, execution: { switchToHttp: () => ({ getRequest: () => request }) } as any };
  };
  beforeEach(() => { process.env.JWT_SECRET = secret; auth.getProfile.mockReset(); });
  afterAll(() => { delete process.env.JWT_SECRET; });

  it('authenticates signed customer identity, ignoring spoofed headers and body', async () => {
    auth.getProfile.mockResolvedValue({ id: 'alice', role: 'CUSTOMER' });
    const token = jwt.sign({ sub: 'alice', tokenType: 'access' }, { secret, expiresIn: '5m' });
    const { request, execution } = context(`Bearer ${token}`);
    expect(await guard.canActivate(execution)).toBe(true);
    expect(request.internalUser).toEqual({ id: 'alice', role: 'CUSTOMER' });
  });

  it('takes the admin role from the server profile, not the token', async () => {
    auth.getProfile.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
    const token = jwt.sign({ sub: 'admin', role: 'CUSTOMER', tokenType: 'access' }, { secret, expiresIn: '5m' });
    const { request, execution } = context(`Bearer ${token}`);
    await guard.canActivate(execution);
    expect(request.internalUser).toEqual({ id: 'admin', role: 'ADMIN' });
  });

  it.each(['missing', 'forged', 'expired', 'refresh', 'no-exp'])('rejects %s token before profile lookup', async (kind) => {
    let token: string | undefined;
    if (kind === 'forged') token = jwt.sign({ sub: 'alice', tokenType: 'access' }, { secret: 'wrong', expiresIn: '5m' });
    if (kind === 'expired') token = jwt.sign({ sub: 'alice', tokenType: 'access' }, { secret, expiresIn: -1 });
    if (kind === 'refresh') token = jwt.sign({ sub: 'alice', tokenType: 'refresh' }, { secret, expiresIn: '5m' });
    if (kind === 'no-exp') token = jwt.sign({ sub: 'alice', tokenType: 'access' }, { secret });
    const { execution } = context(token ? `Bearer ${token}` : undefined);
    await expect(guard.canActivate(execution)).rejects.toThrow();
    expect(auth.getProfile).not.toHaveBeenCalled();
  });

  it('rejects inactive accounts or profile lookup failure', async () => {
    auth.getProfile.mockRejectedValue(new Error('unavailable'));
    const token = jwt.sign({ sub: 'alice', tokenType: 'access' }, { secret, expiresIn: '5m' });
    const { execution } = context(`Bearer ${token}`);
    await expect(guard.canActivate(execution)).rejects.toThrow();
  });

  it.each(['cartView', 'cartAdd', 'cartRemove', 'orderPreview', 'orderStatus', 'orderCancel', 'ticketCreate', 'manageFavorite'])
  ('requires the user guard on customer-scoped handler %s', (handler) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, (InternalAgentController.prototype as any)[handler]);
    expect(guards).toContain(InternalUserGuard);
  });
});
