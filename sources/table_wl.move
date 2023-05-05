module wl::table_wl {
    use std::vector;

    use sui::event;
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::tx_context::TxContext;

    struct Wl has key {
        id: UID,
        addresses: Table<address, bool>
    }

    struct Output has copy, drop {
        is_whitelisted: bool
    }

    public fun create(addresses: vector<address>, ctx: &mut TxContext): Wl {
        let wl = Wl { 
            id: object::new(ctx), 
            addresses: table::new(ctx) 
        };

        while(!vector::is_empty(&addresses)) {
            let addr = vector::pop_back(&mut addresses);
            table::add(&mut wl.addresses, addr, true)
        };

        wl
    }
    
    public fun return_and_share(wl: Wl) {
        transfer::share_object(wl)
    }

    public fun is_whitelisted(wl: &Wl, addr: address) {
        let is_whitelisted = table::contains(&wl.addresses, addr);
        event::emit(Output { is_whitelisted });
    }
}