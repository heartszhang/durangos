#pragma once
#include "durango_h.h"
namespace ABI {
namespace durango {
namespace adk {
namespace wrl {
      class Dummy : public RuntimeClass < IDummy > {
        InspectableClass( RuntimeClass_durango_adk_wrl_Dummy, BaseTrust )
      public:
        Dummy() {}
        HRESULT __stdcall Hello( _In_ int a, _In_ int b, _Out_ int* value ) {
          OutputDebugStringW( L"what in a wrl component.\n" );
          *value = a + b;
          return S_OK;
        }
      };
      ActivatableClass( Dummy );
} /*wrl*/
} /*adk*/
} /*durango*/
}