"""Testes de contrato dos adapters locais sem chamadas de rede."""
import unittest
from local_adapters import (AdapterError, LocalCheckoutAdapter, LocalEmailAdapter,
                            LocalHandoffAdapter, validate_official_checkout_url)


class LocalAdapterTests(unittest.TestCase):
    def test_external_checkout_requires_official_https_domain(self):
        self.assertEqual(validate_official_checkout_url('https://checkout.dattavps.com/plan','dattavps.com'), 'https://checkout.dattavps.com/plan')
        for url in ('http://dattavps.com/plan','https://user:pass@dattavps.com/plan','https://evil.example/plan'):
            with self.assertRaises(AdapterError): validate_official_checkout_url(url,'dattavps.com')

    def test_mock_checkout_is_local_and_preserves_coupon(self):
        session=LocalCheckoutAdapter().create('ord_demo',100,'BRL','NEG10')
        self.assertEqual((session['url'],session['coupon']),('mock://checkout/ord_demo','NEG10'))
        with self.assertRaises(AdapterError): LocalCheckoutAdapter().create('ord_demo',0,'BRL')

    def test_email_and_handoff_contracts_require_expected_state(self):
        with self.assertRaises(AdapterError): LocalEmailAdapter().send('email_demo','a@local.invalid',False)
        self.assertEqual(LocalEmailAdapter().send('email_demo','a@local.invalid',True)['status'],'sent_simulated')
        self.assertEqual(LocalHandoffAdapter().dispatch('ord_demo','dattavps')['status'],'sent')
        with self.assertRaises(AdapterError): LocalHandoffAdapter().dispatch('','dattavps')


if __name__ == '__main__': unittest.main()
