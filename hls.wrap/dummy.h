#pragma once
#include "hls.wrap_h.h"
namespace ABI {namespace hls {namespace wrap {

  class Dummy : public RuntimeClass < IDummy > {
    InspectableClass( RuntimeClass_hls_wrap_Dummy, BaseTrust )
  public:
    Dummy() {}
    HRESULT __stdcall Hello( _In_ int a, _In_ int b, _Out_ int* value ) {
      OutputDebugStringW( L"what in a wrl component.\n" );
      *value = a + b;
      return S_OK;
    }
  };
  ActivatableClass( Dummy );

}}}