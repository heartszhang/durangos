#pragma once
#include "hls.wrap.h"
namespace ABI {
namespace hls { 
namespace wrap {
  class HttpLiveProxySchemeHandler : public RuntimeClass < RuntimeClassFlags<WinRtClassicComMix>
    , ABI::Windows::Media::IMediaExtension
    , IMFSchemeHandler > {
    InspectableClass( RuntimeClass_hls_wrap_HttpLiveProxySchemeHandler, BaseTrust )
  public:
    HttpLiveProxySchemeHandler();
    ~HttpLiveProxySchemeHandler();

    HRESULT RuntimeClassInitialize();   //hide RuntimeClassBase::RuntimeClassInitialize

    //IMFSchemeHandler
    STDMETHODIMP BeginCreateObject( LPCWSTR url,
                                    DWORD flags,
                                    IPropertyStore *props,
                                    IUnknown **cancel,
                                    IMFAsyncCallback *cb,
                                    IUnknown *s ) override;

    STDMETHODIMP EndCreateObject( IMFAsyncResult *result, MF_OBJECT_TYPE *objtype, IUnknown **obj ) override;
    STDMETHODIMP CancelObjectCreation( IUnknown *cancel_cookie ) override;

  public:
    virtual HRESULT STDMETHODCALLTYPE SetProperties(
      /* [in] */ __RPC__in_opt ABI::Windows::Foundation::Collections::IPropertySet *configuration ) override;
  private:
    ComPtr<IMFSourceResolver> resolver;
  };
}  }}