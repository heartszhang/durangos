#include "pch.h"
#include "httpliveschemehandler.h"
#include <cassert>
//using namespace Platform;
using namespace ABI::hls::wrap;
ActivatableClass(HttpLiveProxySchemeHandler);

HttpLiveProxySchemeHandler::HttpLiveProxySchemeHandler() {
  dump( L"%p, %s created\n", this, RuntimeClass_hls_wrap_HttpLiveProxySchemeHandler );
}

HttpLiveProxySchemeHandler::~HttpLiveProxySchemeHandler() {
  dump( L"%p dtor\n", this );
}

HRESULT HttpLiveProxySchemeHandler::RuntimeClassInitialize() {
  auto hr = MFCreateSourceResolver(&resolver);
  dump( L"hsh create source resolver 0x%X\n", hr );
  return hr;
}
HRESULT HttpLiveProxySchemeHandler::BeginCreateObject(LPCWSTR url, DWORD flags, IPropertyStore * props, IUnknown ** cancel, IMFAsyncCallback * cb, IUnknown * s) {
  assert(resolver);
  auto innercb = CreateAsyncCallbackProxy( cb, s );
  auto hr = resolver->BeginCreateObjectFromURL( url
                                                , FlagsWithoutLocal( flags )
                                                , props, cancel, innercb.Get(), nullptr );
  dump( L"resolver begin %s, hr : %X, flags=%X\n", url, hr, flags);
  return hr;
}
HRESULT HttpLiveProxySchemeHandler::EndCreateObject(IMFAsyncResult * result, MF_OBJECT_TYPE * objtype, IUnknown ** obj) {
  auto innerresult = InnerResultFromOuterAsyncResult( result );
  auto hr = resolver->EndCreateObjectFromURL( innerresult.Get(), objtype, obj );
  dump( L"end-create type: %d, %p\n", *objtype, *obj );
  if ( ok( hr ) && *objtype == MF_OBJECT_BYTESTREAM ) {
    *obj = MakeByteStreamProxy( *obj ).Detach();
  } else if ( ok( hr ) && *objtype == MF_OBJECT_MEDIASOURCE ) {
    *obj = MakeMediaSourceProxy( *obj ).Detach();
  }
  return hr;
}

HRESULT HttpLiveProxySchemeHandler::CancelObjectCreation(IUnknown * cancel_cookie) {
  dump( L"cancel creation\n" );
  return resolver->CancelObjectCreation(cancel_cookie);
}

HRESULT HttpLiveProxySchemeHandler::SetProperties(ABI::Windows::Foundation::Collections::IPropertySet * ) {
  dump( L"set-properties but we do nothing\n" );
  return S_OK;
}

