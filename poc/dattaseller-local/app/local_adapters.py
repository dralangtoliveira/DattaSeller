"""Contratos desacoplados para integrações comerciais futuras.

Os adapters locais não fazem rede. Eles servem para testar transições e
mantêm a fronteira que uma integração DattaVPS, DattaSeg, gateway ou e-mail
real deverá respeitar.
"""
from urllib.parse import urlparse


class AdapterError(ValueError):
    pass


def validate_official_checkout_url(url, official_domain):
    """Aceita somente HTTPS sem credenciais e no domínio oficialmente definido."""
    parsed = urlparse(str(url or '').strip())
    hostname = (parsed.hostname or '').lower().removeprefix('www.')
    allowed = str(official_domain or '').lower().removeprefix('www.')
    if parsed.scheme != 'https' or not hostname or parsed.username or parsed.password:
        raise AdapterError('Checkout externo deve usar URL HTTPS sem credenciais.')
    if not allowed or not (hostname == allowed or hostname.endswith('.' + allowed)):
        raise AdapterError('Checkout externo deve usar o domínio oficial configurado.')
    return parsed.geturl()


class LocalCheckoutAdapter:
    name = 'local-mock-checkout'

    def create(self, order_id, amount, currency, coupon=None):
        if float(amount) <= 0:
            raise AdapterError('Pedido precisa de valor positivo.')
        return {'provider':self.name, 'order_id':order_id, 'amount':float(amount),
                'currency':currency, 'coupon':coupon, 'url':'mock://checkout/' + order_id}


class LocalEmailAdapter:
    name = 'local-mock-email'

    def send(self, email_id, recipient, approved):
        if not approved:
            raise AdapterError('E-mail exige aprovação humana antes do envio.')
        return {'provider':self.name, 'email_id':email_id, 'recipient':recipient or '', 'status':'sent_simulated'}


class LocalHandoffAdapter:
    name = 'local-mock-handoff'

    def dispatch(self, order_id, product_id):
        if not order_id or not product_id:
            raise AdapterError('Handoff exige pedido e produto.')
        return {'provider':self.name, 'order_id':order_id, 'product_id':product_id, 'status':'sent'}
